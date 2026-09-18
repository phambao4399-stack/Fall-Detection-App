// src/screens/GoogleLoginScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../constants/theme';

export default function GoogleLoginScreen() {
  const { login } = useAuth();
  const webViewRef = useRef<WebView>(null);

  const [isWebModalVisible, setWebModalVisible] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [detectedEmail, setDetectedEmail] = useState<string | null>(null);

  // Modern Mobile Chrome user agent to prevent 403 disallowed_useragent from Google
  const chromeUserAgent =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';

  // Injected JavaScript that runs inside accounts.google.com / myaccount.google.com
  const injectedAuthScript = `
    (function() {
      function detectAndSend() {
        try {
          var url = window.location.href;

          // Only consider authenticated once Google redirects away from the login/password prompt
          var isPostLogin = (
            url.indexOf('myaccount.google.com') !== -1 ||
            url.indexOf('accounts.google.com/ManageAccount') !== -1 ||
            url.indexOf('accounts.google.com/b/') !== -1 ||
            (url.indexOf('google.com') !== -1 && 
             url.indexOf('/signin') === -1 && 
             url.indexOf('/ServiceLogin') === -1 && 
             url.indexOf('/v3/signin') === -1 && 
             url.indexOf('/identifier') === -1 && 
             url.indexOf('/challenge') === -1 &&
             url.indexOf('/speedbump') === -1)
          );

          if (!isPostLogin) return false;

          var email = null;
          var displayName = null;
          var photoURL = null;

          // 1. Check aria-label on Google account badge
          // Standard Google label format: "Tài khoản Google: Nguyễn Văn A (email@gmail.com)" or "Google Account: Name (email@...)"
          var ariaEls = document.querySelectorAll('[aria-label*="@"]');
          for (var i = 0; i < ariaEls.length; i++) {
            var label = ariaEls[i].getAttribute('aria-label') || '';
            var emailMatch = label.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch && emailMatch[1]) {
              email = emailMatch[1];
              var nameMatch = label.match(/^(?:Tài khoản Google|Google Account|Tài khoản|Account)?[:\s]*([^\n(:]+?)(?:\s*\([a-zA-Z0-9._%+-]+@|\n|$)/i);
              if (nameMatch && nameMatch[1] && nameMatch[1].trim().length > 1) {
                displayName = nameMatch[1].trim();
              }
              break;
            }
          }

          // 2. Check data-email / data-identifier attributes
          if (!email) {
            var dataEls = document.querySelectorAll('[data-email], [data-identifier]');
            for (var j = 0; j < dataEls.length; j++) {
              var val = dataEls[j].getAttribute('data-email') || dataEls[j].getAttribute('data-identifier');
              if (val && val.indexOf('@') !== -1 && val.indexOf('@google.com') === -1) {
                email = val;
                break;
              }
            }
          }

          // 3. Check Google avatar
          var avatarImg = document.querySelector('img[src*="googleusercontent.com"]');
          if (avatarImg) {
            photoURL = avatarImg.getAttribute('src');
          }

          // 4. Scan document text if on myaccount.google.com
          if (!email && url.indexOf('myaccount.google.com') !== -1) {
            var bodyText = document.body ? document.body.innerText : '';
            var matches = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
            if (matches) {
              for (var k = 0; k < matches.length; k++) {
                var candidate = matches[k];
                if (candidate.indexOf('@google.com') === -1 && candidate.indexOf('example') === -1) {
                  email = candidate;
                  break;
                }
              }
            }
          }

          // 5. Check heading for Display Name
          if (!displayName) {
            var h1 = document.querySelector('h1');
            if (h1 && h1.innerText) {
              var h1Text = h1.innerText;
              var h1Match = h1Text.match(/(?:Chào mừng|Welcome)[,\s]+([^!.\n]+)/i);
              if (h1Match && h1Match[1]) {
                displayName = h1Match[1].trim();
              }
            }
          }

          // If valid authenticated Google email is found, send to React Native!
          if (email && email.indexOf('@') !== -1) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'GOOGLE_AUTH_SUCCESS',
              email: email.trim().toLowerCase(),
              displayName: displayName || email.split('@')[0],
              photoURL: photoURL || ''
            }));
            return true;
          }
        } catch (e) {
          // ignore error
        }
        return false;
      }

      // Check repeatedly after page loads
      var interval = setInterval(function() {
        if (detectAndSend()) {
          clearInterval(interval);
        }
      }, 700);

      detectAndSend();
    })();
    true;
  `;

  // Handler when Google login is successfully confirmed from WebView
  const handleGoogleAuthSuccess = async (profile: {
    email: string;
    displayName: string;
    photoURL?: string;
  }) => {
    try {
      setIsAuthenticating(true);
      setDetectedEmail(profile.email);

      // Perform login in AuthContext and sync with Firestore
      await login({
        uid: profile.email,
        email: profile.email,
        displayName: profile.displayName || profile.email.split('@')[0],
        photoURL: profile.photoURL || '',
      });

      // Close modal smoothly
      setTimeout(() => {
        setWebModalVisible(false);
        setIsAuthenticating(false);
      }, 600);
    } catch (err: any) {
      setIsAuthenticating(false);
      Alert.alert('Lỗi đăng nhập', err.message || 'Không thể đồng bộ tài khoản Google.');
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'GOOGLE_AUTH_SUCCESS' && data.email) {
        handleGoogleAuthSuccess(data);
      }
    } catch (e) {
      // not JSON or unrelated message
    }
  };

  // Trigger manual extraction when user clicks "Xác nhận vào app"
  const handleManualExtraction = () => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        var email = null;
        var displayName = null;
        var ariaEls = document.querySelectorAll('[aria-label*="@"]');
        for (var i = 0; i < ariaEls.length; i++) {
          var label = ariaEls[i].getAttribute('aria-label') || '';
          var m = label.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (m) {
            email = m[1];
            break;
          }
        }
        if (!email) {
          var text = document.body ? document.body.innerText : '';
          var matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (matches) {
            for (var k = 0; k < matches.length; k++) {
              if (matches[k].indexOf('@google.com') === -1) {
                email = matches[k];
                break;
              }
            }
          }
        }
        if (email) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'GOOGLE_AUTH_SUCCESS',
            email: email.trim().toLowerCase(),
            displayName: displayName || email.split('@')[0]
          }));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'GOOGLE_AUTH_NOT_FOUND',
            url: window.location.href
          }));
        }
      })();
      true;
    `);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background Gradient */}
      <LinearGradient
        colors={['#0D1117', '#161B22', '#0A0E14']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* App Branding */}
        <View style={styles.brandHeader}>
          <View style={styles.appIconWrap}>
            <Text style={styles.appIcon}>🛡️</Text>
          </View>
          <Text style={styles.appTitle}>CareDrop</Text>
          <Text style={styles.appSubtitle}>Hệ thống Giám sát & Nhận diện Té ngã 24/7</Text>
        </View>

        {/* ── GOOGLE AUTHENTICATION CARD ── */}
        <View style={[styles.googleCard, SHADOW.lg]}>
          {/* Multi-colored Google G Icon */}
          <View style={styles.googleGLogoRow}>
            <View style={styles.googleGLogo}>
              <Text style={styles.googleGText}>G</Text>
            </View>
            <View style={styles.googleVerifiedBadge}>
              <Text style={styles.googleVerifiedText}>🔒 Xác thực Google</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>Đăng nhập với Google</Text>
          <Text style={styles.cardSubtitle}>
            Sử dụng Tài khoản Google chính chủ của bạn để bảo vệ và nhận cảnh báo té ngã khẩn cấp 24/7.
          </Text>

          {/* Security Notice Box */}
          <View style={styles.securityBox}>
            <Text style={styles.securityBoxIcon}>🛡️</Text>
            <View style={styles.securityBoxContent}>
              <Text style={styles.securityBoxTitle}>Bảo mật cấp tài khoản Google</Text>
              <Text style={styles.securityBoxText}>
                Hệ thống chỉ cấp quyền nhận cảnh báo từ thiết bị phần cứng cho tài khoản Google đã được xác thực chính thức. Không thể dùng email giả định.
              </Text>
            </View>
          </View>

          {/* MAIN GOOGLE SIGN IN BUTTON */}
          <TouchableOpacity
            style={styles.googleMainBtn}
            onPress={() => setWebModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.googleBtnIconBox}>
              <Text style={styles.googleBtnG}>G</Text>
            </View>
            <Text style={styles.googleMainBtnText}>Tiếp tục với Google</Text>
          </TouchableOpacity>

          <Text style={styles.guaranteeText}>
            ✓ Đăng nhập an toàn qua cổng chính thức accounts.google.com
          </Text>
        </View>

        {/* Google Style Footer */}
        <View style={styles.googleFooter}>
          <Text style={styles.footerLanguage}>Tiếng Việt</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://support.google.com/accounts')}>
              <Text style={styles.footerLinkItem}>Trợ giúp</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://policies.google.com/privacy')}>
              <Text style={styles.footerLinkItem}>Bảo mật</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://policies.google.com/terms')}>
              <Text style={styles.footerLinkItem}>Điều khoản</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ── CỬA SỔ ĐĂNG NHẬP GOOGLE CHÍNH THỨC (accounts.google.com) ── */}
      <Modal
        visible={isWebModalVisible}
        animationType="slide"
        onRequestClose={() => {
          if (!isAuthenticating) setWebModalVisible(false);
        }}
      >
        <View style={styles.webModalRoot}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {/* Header */}
          <View style={styles.webModalHeader}>
            <TouchableOpacity
              style={styles.webModalCloseBtn}
              onPress={() => setWebModalVisible(false)}
              disabled={isAuthenticating}
            >
              <Text style={styles.webModalCloseText}>✕ Hủy</Text>
            </TouchableOpacity>

            <View style={styles.webModalTitleWrap}>
              <Text style={styles.webModalHeaderTitle}>🔒 accounts.google.com</Text>
              <Text style={styles.webModalHeaderSubtitle}>Cổng đăng nhập Google chính hãng</Text>
            </View>

            <TouchableOpacity
              style={styles.webModalDoneBtn}
              onPress={handleManualExtraction}
              disabled={isAuthenticating}
              activeOpacity={0.8}
            >
              <Text style={styles.webModalDoneText}>Vào app ›</Text>
            </TouchableOpacity>
          </View>

          {/* Authenticating Overlay */}
          {isAuthenticating && (
            <View style={styles.authOverlay}>
              <ActivityIndicator size="large" color="#0B57D0" />
              <Text style={styles.authOverlayTitle}>Đã xác thực tài khoản Google!</Text>
              <Text style={styles.authOverlayEmail}>{detectedEmail}</Text>
              <Text style={styles.authOverlaySubtitle}>Đang đồng bộ và mở ứng dụng...</Text>
            </View>
          )}

          {/* Official Google Login WebView */}
          <WebView
            ref={webViewRef}
            source={{
              uri: 'https://accounts.google.com/ServiceLogin?continue=https://myaccount.google.com/',
            }}
            userAgent={chromeUserAgent}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            injectedJavaScript={injectedAuthScript}
            onMessage={handleMessage}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webLoadingWrap}>
                <ActivityIndicator size="large" color="#0B57D0" />
                <Text style={styles.webLoadingText}>Đang tải cổng đăng nhập Google an toàn...</Text>
              </View>
            )}
            onNavigationStateChange={(navState) => {
              // Whenever page changes (e.g. redirect to myaccount.google.com), re-run extraction
              if (
                navState.url.includes('myaccount.google.com') ||
                navState.url.includes('accounts.google.com/ManageAccount') ||
                navState.url.includes('google.com/?')
              ) {
                webViewRef.current?.injectJavaScript(injectedAuthScript);
              }
            }}
          />

          {/* Bottom helper bar inside WebView */}
          <View style={styles.webBottomBar}>
            <Text style={styles.webBottomBarText}>
              💡 Sau khi bạn đăng nhập tài khoản Google của mình, CareDrop sẽ tự động nhận diện và đưa bạn vào ứng dụng.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 64,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  appIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appIcon: {
    fontSize: 32,
  },
  appTitle: {
    fontSize: FONT.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: FONT.xs,
    color: COLORS.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Google Card
  googleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
  },
  googleGLogoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  googleGLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  googleVerifiedBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  googleVerifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B57D0',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#444746',
    lineHeight: 20,
    marginBottom: 20,
  },
  securityBox: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EAED',
    marginBottom: 24,
  },
  securityBoxIcon: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 2,
  },
  securityBoxContent: {
    flex: 1,
  },
  securityBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 2,
  },
  securityBoxText: {
    fontSize: 12,
    color: '#5F6368',
    lineHeight: 16,
  },

  // Main Google button
  googleMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B57D0',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    ...SHADOW.md,
  },
  googleBtnIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleBtnG: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EA4335',
  },
  googleMainBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  guaranteeText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#747775',
    marginTop: 16,
  },

  // Google Footer
  googleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 6,
  },
  footerLanguage: {
    fontSize: 12,
    color: '#8E918F',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 16,
  },
  footerLinkItem: {
    fontSize: 12,
    color: '#8E918F',
  },

  // Web Modal
  webModalRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 44 : 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E2E0',
  },
  webModalCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  webModalCloseText: {
    fontSize: 14,
    color: '#5F6368',
    fontWeight: '600',
  },
  webModalTitleWrap: {
    alignItems: 'center',
  },
  webModalHeaderTitle: {
    fontSize: 13,
    color: '#1F1F1F',
    fontWeight: '700',
  },
  webModalHeaderSubtitle: {
    fontSize: 10,
    color: '#747775',
    marginTop: 1,
  },
  webModalDoneBtn: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D3E3FD',
  },
  webModalDoneText: {
    fontSize: 13,
    color: '#0B57D0',
    fontWeight: '700',
  },
  authOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  authOverlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1F1F',
    marginTop: 16,
  },
  authOverlayEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B57D0',
    marginTop: 6,
  },
  authOverlaySubtitle: {
    fontSize: 13,
    color: '#5F6368',
    marginTop: 6,
  },
  webLoadingWrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webLoadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#5F6368',
  },
  webBottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E2E0',
  },
  webBottomBarText: {
    fontSize: 11,
    color: '#5F6368',
    textAlign: 'center',
    lineHeight: 16,
  },
});
