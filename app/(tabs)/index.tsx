import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, Dimensions, Platform, Alert, Image, ActivityIndicator 
} from 'react-native';
// 必须引入 polyfill 以支持 Supabase 在 React Native 环境下的 URL 处理
import 'react-native-url-polyfill/auto'; 
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function DentalApp() {
  // --- 状态管理 ---
  const [patients, setPatients] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  
  // --- 相机逻辑状态 ---
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activePatientId, setActivePatientId] = useState<number | null>(null);
  const cameraRef = useRef<any>(null);

  // --- 初始化数据 ---
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPatients(data);
    if (error) console.error('数据加载失败:', error.message);
    setLoading(false);
  };

  // --- 业务逻辑：添加患者 ---
  const addPatient = async () => {
    if (!name || !phone) {
      Alert.alert('提示', '请填写完整信息');
      return;
    }
    const { error } = await supabase.from('patients').insert([{ name, phone }]);
    if (!error) {
      setName('');
      setPhone('');
      fetchPatients();
    } else {
      Alert.alert('错误', error.message);
    }
  };

  // --- 业务逻辑：拍照并上传 ---
  const takeAndUploadPhoto = async () => {
    if (!cameraRef.current || !activePatientId) return;

    try {
      // 1. 拍照并压缩质量至 0.5 (节省存储桶空间)
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      
      // 2. 将图片转为 Base64 以便上传
      const base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: 'base64' });
      const fileName = `patient_${activePatientId}/${Date.now()}.jpg`;

      // 3. 上传至 Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('dental-images')
        .upload(fileName, decode(base64), { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 4. 获取公开 URL
      const { data: { publicUrl } } = supabase.storage.from('dental-images').getPublicUrl(fileName);

      // 5. 关联到数据库 (Clinical Records)
      await supabase.from('clinical_records').insert([
        { patient_id: activePatientId, image_attachments: { url: publicUrl } }
      ]);

      Alert.alert('成功', '影像已实时同步至云端');
      setIsCameraOpen(false);
    } catch (err: any) {
      Alert.alert('上传失败', err.message);
    }
  };

  // --- 权限检查渲染 ---
  if (isCameraOpen) {
    if (!permission) return <View />;
    if (!permission.granted) {
      return (
        <View style={styles.centerContainer}>
          <Text>需要相机权限才能拍摄病历</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.button}>
            <Text style={styles.buttonText}>授予权限</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <CameraView style={StyleSheet.absoluteFill} ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          <TouchableOpacity onPress={takeAndUploadPhoto} style={styles.captureButton}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsCameraOpen(false)} style={styles.closeButton}>
            <Text style={{color: 'white'}}>取消</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    );
  }

  // --- 主界面渲染 ---
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🦷 牙科诊所管理系统</Text>
      </View>

      <View style={[styles.content, isWeb && width > 768 ? styles.webRow : styles.mobileColumn]}>
        
        {/* 表单部分 */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>新患者登记</Text>
          <TextInput 
            style={styles.input} 
            placeholder="患者姓名" 
            value={name} 
            onChangeText={setName} 
          />
          <TextInput 
            style={styles.input} 
            placeholder="联系电话" 
            keyboardType="phone-pad"
            value={phone} 
            onChangeText={setPhone} 
          />
          <TouchableOpacity style={styles.button} onPress={addPatient}>
            <Text style={styles.buttonText}>确认挂号</Text>
          </TouchableOpacity>
        </View>

        {/* 列表部分 */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>就诊队列</Text>
          {loading ? <ActivityIndicator color="#007AFF" /> : (
            <FlatList
              data={patients}
              keyExtractor={(item) => item.patient_id.toString()}
              renderItem={({ item }) => (
                <View style={styles.patientCard}>
                  <View>
                    <Text style={styles.patientName}>{item.name}</Text>
                    <Text style={styles.patientPhone}>{item.phone}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.photoButton} 
                    onPress={() => {
                      setActivePatientId(item.patient_id);
                      setIsCameraOpen(true);
                    }}
                  >
                    <Text style={styles.photoButtonText}>📸 拍照</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// --- 样式定义 ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: { height: 60, backgroundColor: '#007AFF', justifyContent: 'center', paddingHorizontal: 20, paddingTop: 10 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 15 },
  webRow: { flexDirection: 'row', gap: 20 },
  mobileColumn: { flexDirection: 'column' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  formSection: { flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  listSection: { flex: 2, backgroundColor: 'white', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#1C1C1E' },
  input: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#E5E5E5' },
  button: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' },

  patientCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  patientName: { fontSize: 17, fontWeight: '600' },
  patientPhone: { color: '#8E8E93', fontSize: 14 },
  
  photoButton: { backgroundColor: '#E1F5FE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  photoButtonText: { color: '#0288D1', fontWeight: 'bold' },

  // 相机相关样式
  cameraOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white' },
  closeButton: { position: 'absolute', top: 50, right: 30, padding: 10 }
});