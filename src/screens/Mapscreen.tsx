// src/screens/Mapscreen.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Linking,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useDevice } from '../context/DeviceContext';
import { COLORS, RADIUS, SHADOW, SPACING } from '../constants/theme';

const { width } = Dimensions.get('window');
const BOTTOM_BAR_HEIGHT = 80;

// 50 tọa độ lộ trình thực tế tại Thủ Đức
const DEFAULT_ROUTE_COORDS = [
  { latitude: 10.854087, longitude: 106.774447 },
  { latitude: 10.853457, longitude: 106.773371 },
  { latitude: 10.852904, longitude: 106.773702 },
  { latitude: 10.852144, longitude: 106.774165 },
  { latitude: 10.851941, longitude: 106.774254 },
  { latitude: 10.851794, longitude: 106.774289 },
  { latitude: 10.851603, longitude: 106.77432 },
  { latitude: 10.851452, longitude: 106.774319 },
  { latitude: 10.851068, longitude: 106.774217 },
  { latitude: 10.850502, longitude: 106.773969 },
  { latitude: 10.850133, longitude: 106.773827 },
  { latitude: 10.849875, longitude: 106.773599 },
  { latitude: 10.849778, longitude: 106.773513 },
  { latitude: 10.849663, longitude: 106.773415 },
  { latitude: 10.84967, longitude: 106.773214 },
  { latitude: 10.849705, longitude: 106.772239 },
  { latitude: 10.849683, longitude: 106.772104 },
  { latitude: 10.849587, longitude: 106.77224 },
  { latitude: 10.849554, longitude: 106.772956 },
  { latitude: 10.849546, longitude: 106.7732 },
  { latitude: 10.849541, longitude: 106.77334 },
  { latitude: 10.849522, longitude: 106.773378 },
  { latitude: 10.849481, longitude: 106.773463 },
  { latitude: 10.849415, longitude: 106.773563 },
  { latitude: 10.849253, longitude: 106.773768 },
  { latitude: 10.84918, longitude: 106.773849 },
  { latitude: 10.848964, longitude: 106.774093 },
  { latitude: 10.848861, longitude: 106.774194 },
  { latitude: 10.848805, longitude: 106.774143 },
  { latitude: 10.848617, longitude: 106.773988 },
  { latitude: 10.848515, longitude: 106.773946 },
  { latitude: 10.848266, longitude: 106.773741 },
  { latitude: 10.847989, longitude: 106.773512 },
  { latitude: 10.847829, longitude: 106.773401 },
  { latitude: 10.84777, longitude: 106.773333 },
  { latitude: 10.847344, longitude: 106.773048 },
  { latitude: 10.847169, longitude: 106.772941 },
  { latitude: 10.846148, longitude: 106.772332 },
  { latitude: 10.845979, longitude: 106.77223 },
  { latitude: 10.845807, longitude: 106.772126 },
  { latitude: 10.845484, longitude: 106.771941 },
  { latitude: 10.844939, longitude: 106.771621 },
  { latitude: 10.841915, longitude: 106.769917 },
  { latitude: 10.840985, longitude: 106.769378 },
  { latitude: 10.840879, longitude: 106.769356 },
  { latitude: 10.840806, longitude: 106.769308 },
  { latitude: 10.840704, longitude: 106.769252 },
  { latitude: 10.840492, longitude: 106.769134 },
  { latitude: 10.840177, longitude: 106.769757 },
  { latitude: 10.840043, longitude: 106.770022 },
];

function formatCoord(n?: number, decimals = 6) {
  if (n === undefined || n === null) return '--';
  return n.toFixed(decimals);
}

export default function MapScreen() {
  const { deviceData } = useDevice();
  const webViewRef = useRef<WebView>(null);
  const sheetAnim = useRef(new Animated.Value(1)).current;

  // 3 chế độ bản đồ: Tối | Đường | Vệ tinh
  const [mapMode, setMapMode] = useState<'dark' | 'standard' | 'satellite'>('standard');
  const [sheetOpen, setSheetOpen] = useState(true);

  // Tọa độ người bị té ngã
  const victimLat = deviceData?.latitude ?? 10.840000;
  const victimLng = deviceData?.longitude ?? 106.770000;

  // Tọa độ điện thoại người cứu hộ (Bạn - Đường số 7 Thủ Đức)
  const userLat = 10.854087;
  const userLng = 106.774447;

  const [routeCoords, setRouteCoords] = useState(DEFAULT_ROUTE_COORDS);
  const [distanceKm, setDistanceKm] = useState('2.24');
  const [travelMinutes, setTravelMinutes] = useState(3);

  // Fetch lộ trình thời gian thực từ OSRM nếu tọa độ thay đổi
  useEffect(() => {
    let isMounted = true;
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${victimLng},${victimLat}?overview=full&geometries=geojson`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'FallDetectionApp/1.0' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0 && isMounted) {
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map(([lon, lat]: [number, number]) => ({
              latitude: lat,
              longitude: lon,
            }));
            setRouteCoords(coords);
            setDistanceKm((route.distance / 1000).toFixed(2));
            setTravelMinutes(Math.max(1, Math.round(route.duration / 60)));
          }
        }
      } catch (_e) {
        // Sử dụng lộ trình mẫu đã có
      }
    };
    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, [userLat, userLng, victimLat, victimLng]);

  // Điều khiển Bottom Sheet
  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue: sheetOpen ? 1 : 0,
      tension: 120,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [sheetOpen]);

  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 0],
  });

  // Chuyển đổi chế độ bản đồ
  const changeMode = (mode: 'dark' | 'standard' | 'satellite') => {
    setMapMode(mode);
    webViewRef.current?.injectJavaScript(`
      if (window.setTileMode) { window.setTileMode('${mode}'); }
      true;
    `);
  };

  // Căn chỉnh toàn cảnh
  const fitToOverview = () => {
    webViewRef.current?.injectJavaScript(`
      if (window.fitOverview) { window.fitOverview(); }
      true;
    `);
  };

  // Căn giữa vị trí bạn
  const centerOnUser = () => {
    webViewRef.current?.injectJavaScript(`
      if (window.panToUser) { window.panToUser(); }
      true;
    `);
  };

  // Căn giữa vị trí người bị té
  const centerOnVictim = () => {
    webViewRef.current?.injectJavaScript(`
      if (window.panToVictim) { window.panToVictim(); }
      true;
    `);
  };

  // Nút phóng to
  const zoomIn = () => {
    webViewRef.current?.injectJavaScript(`
      if (window.map) { window.map.zoomIn(); }
      true;
    `);
  };

  // Mở ứng dụng Google Maps ngoài để dẫn đường bằng giọng nói
  const openGoogleMapsNavigation = () => {
    const destination = `${victimLat},${victimLng}`;
    const navUrl = Platform.select({
      android: `google.navigation:q=${destination}&mode=d`,
      ios: `comgooglemaps://?daddr=${destination}&directionsmode=driving`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    });

    Linking.canOpenURL(navUrl).then((supported) => {
      if (supported) {
        Linking.openURL(navUrl);
      } else {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
      }
    });
  };

  // Tạo mã HTML Leaflet hiển thị bản đồ độc lập không cần Google Maps API Key
  const mapHtml = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; }
    body, html, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: #EAE6DF;
      overflow: hidden;
    }
    .dark-tiles {
      filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(110%);
    }
    .user-marker-wrap {
      position: relative;
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-halo {
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(52, 199, 89, 0.28);
      border: 1px solid rgba(52, 199, 89, 0.6);
      animation: pulse-green 2s infinite ease-out;
    }
    .user-core {
      position: relative;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #007AFF;
      border: 3px solid #34C759;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      z-index: 2;
    }
    .victim-marker-wrap {
      position: relative;
      width: 54px;
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .victim-halo {
      position: absolute;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(0, 122, 255, 0.25);
      border: 1px solid rgba(0, 122, 255, 0.5);
      animation: pulse-blue 1.6s infinite ease-out;
    }
    .victim-core {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #007AFF;
      border: 2.5px solid #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 21px;
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.7);
      z-index: 2;
    }
    @keyframes pulse-green {
      0% { transform: scale(0.85); opacity: 0.9; }
      100% { transform: scale(1.45); opacity: 0; }
    }
    @keyframes pulse-blue {
      0% { transform: scale(0.85); opacity: 0.9; }
      100% { transform: scale(1.45); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var userLat = ${userLat};
    var userLng = ${userLng};
    var victimLat = ${victimLat};
    var victimLng = ${victimLng};
    var coords = ${JSON.stringify(routeCoords)};

    var tileLayers = {
      standard: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }),
      dark: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, className: 'dark-tiles' }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 })
    };

    var currentMode = '${mapMode}';
    var currentTile = tileLayers[currentMode] || tileLayers.standard;

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      layers: [currentTile]
    });

    // Đường viền ngoài xanh dương đậm
    var outerLine = L.polyline(coords.map(function(c) { return [c.latitude, c.longitude]; }), {
      color: '#0091FF',
      weight: 8,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Đường tâm cyan neon nét đứt chuyển động
    var innerLine = L.polyline(coords.map(function(c) { return [c.latitude, c.longitude]; }), {
      color: '#00E5FF',
      weight: 4,
      opacity: 1,
      dashArray: '8, 6',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Marker Bạn (Người cứu hộ)
    var userIcon = L.divIcon({
      className: '',
      html: '<div class="user-marker-wrap"><div class="user-halo"></div><div class="user-core">👤</div></div>',
      iconSize: [52, 52],
      iconAnchor: [26, 26]
    });
    var userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);

    // Marker Người bị té ngã
    var victimIcon = L.divIcon({
      className: '',
      html: '<div class="victim-marker-wrap"><div class="victim-halo"></div><div class="victim-core">📍</div></div>',
      iconSize: [54, 54],
      iconAnchor: [27, 27]
    });
    var victimMarker = L.marker([victimLat, victimLng], { icon: victimIcon }).addTo(map);

    window.fitOverview = function() {
      var bounds = L.latLngBounds([[userLat, userLng], [victimLat, victimLng]]);
      map.fitBounds(bounds, {
        paddingTopLeft: [50, 180],
        paddingBottomRight: [50, 160],
        animate: true
      });
    };

    window.panToUser = function() {
      map.setView([userLat, userLng], 16, { animate: true });
    };

    window.panToVictim = function() {
      map.setView([victimLat, victimLng], 16, { animate: true });
    };

    window.setTileMode = function(mode) {
      map.removeLayer(currentTile);
      currentTile = tileLayers[mode] || tileLayers.standard;
      map.addLayer(currentTile);
    };

    window.fitOverview();
  </script>
</body>
</html>
    `;
  }, [userLat, userLng, victimLat, victimLng, routeCoords, mapMode]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── BẢN ĐỒ LEAFLET TRỰC TIẾP TRONG APP (KHÔNG CẦN GOOGLE CLOUD KEY) ── */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        bounces={false}
      />

      {/* ── NÚT PHÓNG TO GÓC TRÊN TRÁI ── */}
      <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn} activeOpacity={0.8}>
        <Text style={styles.zoomBtnText}>+</Text>
      </TouchableOpacity>

      {/* ── TOP HEADER & ROUTE CARD ── */}
      <View style={styles.topContainer}>
        {/* Hàng tiêu đề + 3 nút chế độ [Tối | Đường | Vệ tinh] */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle}>Bản đồ cứu hộ</Text>
            <Text style={styles.topSub}>Lộ trình cứu hộ thời gian thực</Text>
          </View>

          <View style={styles.mapToggleWrap}>
            <TouchableOpacity
              style={[styles.mapToggleBtn, mapMode === 'dark' && styles.mapToggleBtnActive]}
              onPress={() => changeMode('dark')}
            >
              <Text style={[styles.mapToggleText, mapMode === 'dark' && styles.mapToggleTextActive]}>
                Tối
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mapToggleBtn, mapMode === 'standard' && styles.mapToggleBtnActive]}
              onPress={() => changeMode('standard')}
            >
              <Text style={[styles.mapToggleText, mapMode === 'standard' && styles.mapToggleTextActive]}>
                Đường
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mapToggleBtn, mapMode === 'satellite' && styles.mapToggleBtnActive]}
              onPress={() => changeMode('satellite')}
            >
              <Text style={[styles.mapToggleText, mapMode === 'satellite' && styles.mapToggleTextActive]}>
                Vệ tinh
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CARD THÔNG TIN LỘ TRÌNH CỨU HỘ ── */}
        <View style={[styles.routeCard, SHADOW.lg]}>
          <View style={styles.routeHeader}>
            {/* Biểu tượng ô tô đỏ */}
            <View style={styles.carIconWrap}>
              <Text style={{ fontSize: 22 }}>🚗</Text>
            </View>

            {/* Chi tiết khoảng cách & thời gian */}
            <View style={styles.routeInfo}>
              <Text style={styles.routeDistanceText}>
                {distanceKm} km · <Text style={styles.routeMinutesText}>~{travelMinutes} phút di chuyển</Text>
              </Text>
              <Text style={styles.routeSubText}>
                Từ điện thoại của bạn 👤 đến người bị té 🚨
              </Text>
            </View>

            {/* Nút Toàn cảnh & nút cài đặt bánh răng */}
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <TouchableOpacity style={styles.gearMiniBtn} onPress={fitToOverview}>
                <Text style={{ fontSize: 16 }}>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.overviewBadge} onPress={fitToOverview}>
                <Text style={styles.overviewText}>[ ] Toàn cảnh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Nút to: Mở Google Maps chỉ đường bằng giọng nói */}
          <TouchableOpacity
            style={styles.navButton}
            activeOpacity={0.85}
            onPress={openGoogleMapsNavigation}
          >
            <Text style={styles.navButtonIcon}>🧭</Text>
            <Text style={styles.navButtonText}>Mở Google Maps chỉ đường bằng giọng nói</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 3 NÚT NỔI BÊN PHẢI (FAB) ── */}
      <View style={styles.fabContainerRight}>
        {/* Nút Toàn cảnh */}
        <TouchableOpacity style={styles.fabBtn} onPress={fitToOverview} activeOpacity={0.75}>
          <Text style={styles.fabIcon}>⛶</Text>
        </TouchableOpacity>

        {/* Nút Vị trí của bạn */}
        <TouchableOpacity style={styles.fabBtn} onPress={centerOnUser} activeOpacity={0.75}>
          <View style={styles.fabUserInner}>
            <Text style={{ fontSize: 18, color: '#FFF' }}>👤</Text>
          </View>
        </TouchableOpacity>

        {/* Nút Vị trí người bị té */}
        <TouchableOpacity style={styles.fabBtn} onPress={centerOnVictim} activeOpacity={0.75}>
          <Text style={{ fontSize: 20 }}>🚨</Text>
        </TouchableOpacity>
      </View>

      {/* ── NÚT THU/PHÓNG BOTTOM SHEET (GÓC TRÁI DƯỚI) ── */}
      <TouchableOpacity
        style={styles.fabBtnLeft}
        onPress={() => setSheetOpen(!sheetOpen)}
        activeOpacity={0.75}
      >
        <Text style={styles.fabIcon}>{sheetOpen ? '▼' : '▲'}</Text>
      </TouchableOpacity>

      {/* ── BOTTOM SHEET THÔNG TIN TỌA ĐỘ (NẰM NGAY TRÊN TAB BAR) ── */}
      <Animated.View
        style={[
          styles.bottomSheet,
          SHADOW.lg,
          { transform: [{ translateY: sheetTranslate }] },
        ]}
      >
        <LinearGradient colors={['#161B22', '#0D1117']} style={StyleSheet.absoluteFill} />

        {/* Thanh kéo handle */}
        <View style={styles.sheetHandle} />

        {/* 2 cột Vĩ độ & Kinh độ */}
        <View style={styles.coordRow}>
          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>VĨ ĐỘ NGƯỜI NGÃ</Text>
            <Text style={styles.coordValue}>{formatCoord(victimLat)}°N</Text>
          </View>

          <View style={styles.coordDivider} />

          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>KINH ĐỘ NGƯỜI NGÃ</Text>
            <Text style={styles.coordValue}>{formatCoord(victimLng)}°E</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1117',
  },

  /* ── NÚT PHÓNG TO GÓC TRÊN TRÁI ── */
  zoomBtn: {
    position: 'absolute',
    top: 40,
    left: 18,
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 4,
  },
  zoomBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    lineHeight: 26,
  },

  /* ── TOP HEADER ── */
  topContainer: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 40,
    marginBottom: 10,
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  topSub: {
    fontSize: 11,
    color: '#D0D7DE',
    marginTop: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* ── BỘ CHỌN CHẾ ĐỘ BẢN ĐỒ [Tối | Đường | Vệ tinh] ── */
  mapToggleWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22, 27, 34, 0.9)',
    borderRadius: RADIUS.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  mapToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  mapToggleBtnActive: {
    backgroundColor: '#007AFF',
  },
  mapToggleText: {
    fontSize: 12,
    color: '#8B949E',
    fontWeight: '600',
  },
  mapToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* ── ROUTE CARD ── */
  routeCard: {
    backgroundColor: '#131926',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  carIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C273C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.35)',
  },
  routeInfo: {
    flex: 1,
  },
  routeDistanceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  routeMinutesText: {
    color: '#00E676',
    fontWeight: '800',
  },
  routeSubText: {
    fontSize: 11,
    color: '#8B949E',
    marginTop: 2,
  },
  gearMiniBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  overviewText: {
    fontSize: 11,
    color: '#C9D1D9',
    fontWeight: '600',
  },
  navButton: {
    backgroundColor: '#007AFF',
    borderRadius: RADIUS.full,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navButtonIcon: {
    fontSize: 16,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* ── FLOATING BUTTONS (FAB) ── */
  fabContainerRight: {
    position: 'absolute',
    right: 16,
    bottom: BOTTOM_BAR_HEIGHT + 90,
    gap: 12,
    zIndex: 10,
  },
  fabBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(22, 27, 34, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  fabUserInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  fabBtnLeft: {
    position: 'absolute',
    left: 16,
    bottom: BOTTOM_BAR_HEIGHT + 90,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(22, 27, 34, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    zIndex: 10,
  },

  /* ── BOTTOM SHEET (VĨ ĐỘ & KINH ĐỘ) ── */
  bottomSheet: {
    position: 'absolute',
    bottom: BOTTOM_BAR_HEIGHT - 6,
    left: 0,
    right: 0,
    height: 96,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    zIndex: 8,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'center',
    marginTop: 8,
  },
  coordRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: 4,
  },
  coordItem: {
    flex: 1,
    alignItems: 'center',
  },
  coordLabel: {
    fontSize: 10,
    color: '#8B949E',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  coordValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  coordDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: SPACING.md,
  },
});
