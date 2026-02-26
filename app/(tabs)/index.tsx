import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, Dimensions, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

// 获取屏幕宽度，用于简单的响应式判断
const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function DentalApp() {
  const [patients, setPatients] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const { data } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (data) setPatients(data);
  };

  const addPatient = async () => {
    if (!name || !phone) return;
    const { error } = await supabase.from('patients').insert([{ name, phone }]);
    if (!error) {
      setName(''); setPhone('');
      fetchPatients();
    }
  };

  return (
    <View style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🦷 牙科诊所管理系统 (Demo)</Text>
      </View>

      <View style={[styles.content, isWeb && width > 768 ? styles.webRow : styles.mobileColumn]}>
        
        {/* 左侧/上方：挂号录入表单 */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>新患者挂号</Text>
          <TextInput 
            style={styles.input} 
            placeholder="姓名" 
            value={name} 
            onChangeText={setName} 
          />
          <TextInput 
            style={styles.input} 
            placeholder="电话" 
            keyboardType="phone-pad"
            value={phone} 
            onChangeText={setPhone} 
          />
          <TouchableOpacity style={styles.button} onPress={addPatient}>
            <Text style={styles.buttonText}>提交录入</Text>
          </TouchableOpacity>
        </View>

        {/* 右侧/下方：患者列表 */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>今日就诊列表</Text>
          <FlatList
            data={patients}
            keyExtractor={(item) => item.patient_id.toString()}
            renderItem={({ item }) => (
              <View style={styles.patientCard}>
                <View>
                  <Text style={styles.patientName}>{item.name}</Text>
                  <Text style={styles.patientPhone}>{item.phone}</Text>
                </View>
                <TouchableOpacity style={styles.detailButton}>
                  <Text style={styles.detailButtonText}>进入诊疗</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { height: 60, backgroundColor: '#007AFF', justifyContent: 'center', paddingHorizontal: 20 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  webRow: { flexDirection: 'row', gap: 20 }, // 网页端横向布局
  mobileColumn: { flexDirection: 'column' }, // iPad/手机端纵向布局
  formSection: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 12, elevation: 3, maxHeight: 300 },
  listSection: { flex: 2, backgroundColor: 'white', padding: 20, borderRadius: 12, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  input: { borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 8, marginBottom: 10 },
  button: { backgroundColor: '#34C759', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  patientCard: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' 
  },
  patientName: { fontSize: 16, fontWeight: '600' },
  patientPhone: { color: '#666', marginTop: 4 },
  detailButton: { backgroundColor: '#E1E9FF', padding: 8, borderRadius: 6 },
  detailButtonText: { color: '#007AFF', fontSize: 12, fontWeight: '600' }
});