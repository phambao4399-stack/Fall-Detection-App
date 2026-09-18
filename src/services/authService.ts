// src/services/authService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

const STORAGE_KEY_USER = '@caredrop_google_account';

/**
 * Lấy thông tin tài khoản Google đã đăng nhập lưu trên máy
 */
export async function getStoredGoogleUser(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch (error) {
    console.warn('[authService] Error getting stored user:', error);
    return null;
  }
}

/**
 * Lưu thông tin tài khoản Google sau khi đăng nhập thành công
 */
export async function saveGoogleUser(user: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));

    // Đồng bộ lên Firestore users/{email} để lưu thông tin người dùng
    try {
      const userRef = doc(db, 'users', user.email.toLowerCase());
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email.toLowerCase(),
          displayName: user.displayName,
          photoURL: user.photoURL || '',
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('[authService] Firestore sync warning:', fsErr);
    }
  } catch (error) {
    console.error('[authService] Error saving user:', error);
    throw error;
  }
}

/**
 * Đăng xuất tài khoản Google
 */
export async function logoutGoogleUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_USER);
  } catch (error) {
    console.warn('[authService] Error during logout:', error);
  }
}
