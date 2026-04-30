import React, { useMemo, useRef, useState } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

export interface EarthMarker {
  lat: number;
  lng: number;
  id?: string;
  color?: string;
  size?: number;
  label?: string;
}

interface EarthGlobeProps {
  size: number;
  highlightCountries?: string[];
  markers?: EarthMarker[];
  initialLat?: number;
  initialLng?: number;
  autoRotate?: boolean;
  onMarkerTap?: (id: string) => void;
  /**
   * Called when the user taps a highlighted country polygon. Receives the
   * raw country name from the geojson feature (e.g. "France", "Canada").
   * Callers can reverse-lookup the language via LANG_DATA.
   */
  onCountryTap?: (countryName: string) => void;
  /**
   * If provided, only the named countries are clickable — non-highlighted
   * polygons stay pointer-through. Defaults to `highlightCountries`.
   */
  clickableCountries?: string[];
  background?: string;
}

/**
 * Photorealistic 3D Earth inside a WebView, seated on a deep-space
 * starfield so it feels like the app's own little universe (not a raw
 * black box). Loads three.js + globe.gl from a CDN, pulls NASA blue-marble,
 * overlays country polygons from Natural Earth geojson.
 *
 * Interactions:
 *   - Falls back gracefully with visible "Loading Earth…" state so the user
 *     never sees a mystery dark circle.
 *   - Marker taps bridge back to RN via onMarkerTap.
 *   - Highlighted-country polygon taps bridge via onCountryTap so RN can
 *     show an info popup ("You can speak French here").
 */
export function EarthGlobe({
  size,
  highlightCountries = [],
  markers = [],
  initialLat = 20,
  initialLng = 0,
  autoRotate = true,
  onMarkerTap,
  onCountryTap,
  clickableCountries,
  background = "#050816",
}: EarthGlobeProps) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const html = useMemo(() => {
    const highlightsJson = JSON.stringify(highlightCountries.map((c) => c.toLowerCase()));
    const clickablesJson = JSON.stringify(
      (clickableCountries ?? highlightCountries).map((c) => c.toLowerCase())
    );
    const markersJson = JSON.stringify(markers);
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:100%;height:100%;overflow:hidden;touch-action:none;color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;}
  /* Deep-space body: layered radial gradient from the center → edge
     (bluish halo around the globe) then fading to near-black corners. */
  body{ background:${background}; }
  /* Three star layers — different sizes, offsets, and drift speeds so the
     field feels alive without being distracting. Pure CSS, no DOM. */
  .stars, .stars2, .stars3{
    position:fixed;inset:0;pointer-events:none;opacity:0.9;
  }
  .stars{
    background-image:
      radial-gradient(1px 1px at 17% 23%, rgba(255,255,255,0.85) 40%, transparent 41%),
      radial-gradient(1px 1px at 62% 8%, rgba(200,220,255,0.9) 40%, transparent 41%),
      radial-gradient(1px 1px at 88% 42%, rgba(255,255,255,0.7) 40%, transparent 41%),
      radial-gradient(1px 1px at 8% 71%, rgba(255,255,255,0.8) 40%, transparent 41%),
      radial-gradient(1px 1px at 38% 94%, rgba(210,225,255,0.7) 40%, transparent 41%),
      radial-gradient(1px 1px at 74% 77%, rgba(255,255,255,0.75) 40%, transparent 41%),
      radial-gradient(0.8px 0.8px at 51% 55%, rgba(255,255,255,0.85) 40%, transparent 41%),
      radial-gradient(0.8px 0.8px at 24% 46%, rgba(255,255,255,0.7) 40%, transparent 41%);
    animation:drift 140s linear infinite;
  }
  .stars2{
    background-image:
      radial-gradient(1.4px 1.4px at 22% 17%, rgba(255,255,255,0.75) 40%, transparent 41%),
      radial-gradient(1.2px 1.2px at 72% 31%, rgba(180,210,255,0.85) 40%, transparent 41%),
      radial-gradient(1.6px 1.6px at 46% 68%, rgba(255,255,255,0.9) 40%, transparent 41%),
      radial-gradient(1.2px 1.2px at 91% 82%, rgba(255,255,255,0.6) 40%, transparent 41%),
      radial-gradient(1.4px 1.4px at 12% 88%, rgba(190,215,255,0.75) 40%, transparent 41%);
    opacity:0.75;
    animation:drift 220s linear infinite reverse;
  }
  /* Occasional twinkle highlight */
  .stars3{
    background-image:
      radial-gradient(2.2px 2.2px at 33% 34%, rgba(255,255,255,0.95) 40%, transparent 42%),
      radial-gradient(2px 2px at 80% 60%, rgba(180,215,255,0.95) 40%, transparent 42%);
    animation:twinkle 4.5s ease-in-out infinite;
  }
  @keyframes drift{ from{transform:translate3d(0,0,0);} to{transform:translate3d(-60px,-40px,0);} }
  @keyframes twinkle{ 0%,100%{opacity:0.5;} 50%{opacity:1;} }
  #g{position:absolute;top:0;left:0;width:100vw;height:100vh;}
  #status{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          text-align:center;color:rgba(255,255,255,0.55);font-size:12px;letter-spacing:0.4px;
          pointer-events:none;transition:opacity 0.4s;}
  .spinner{width:28px;height:28px;margin:0 auto 10px;border:2px solid rgba(255,255,255,0.18);
           border-top-color:rgba(255,255,255,0.7);border-radius:50%;animation:sp 0.9s linear infinite;}
  @keyframes sp{to{transform:rotate(360deg);}}
</style>
</head>
<body>
<div class="stars"></div>
<div class="stars2"></div>
<div class="stars3"></div>
<div id="g"></div>
<div id="status"><div class="spinner"></div>Loading Earth…</div>
<script>
  var MARKERS = ${markersJson};
  var HIGHLIGHTS = ${highlightsJson};
  var CLICKABLES = ${clickablesJson};
  var statusEl = document.getElementById('status');

  function post(msg){
    try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
    catch(e){}
  }
  function setStatus(t){ if(statusEl) statusEl.innerHTML = t; }
  function hideStatus(){ if(statusEl){ statusEl.style.opacity = '0'; setTimeout(function(){ statusEl.style.display='none'; }, 500); } }

  function loadScript(urls, onOk, onFail){
    var i = 0;
    function next(){
      if(i >= urls.length){ onFail && onFail('all failed: '+urls.join(', ')); return; }
      var s = document.createElement('script');
      s.src = urls[i]; s.async = false;
      s.onload = function(){ onOk(urls[i]); };
      s.onerror = function(){ i++; next(); };
      document.head.appendChild(s);
    }
    next();
  }

  function isHighlight(name){
    if(!name) return false;
    name = String(name).toLowerCase();
    for(var i=0;i<HIGHLIGHTS.length;i++){
      if(name.indexOf(HIGHLIGHTS[i])!==-1 || HIGHLIGHTS[i].indexOf(name)!==-1) return true;
    }
    return false;
  }

  loadScript(
    [
      'https://unpkg.com/three@0.149.0/build/three.min.js',
      'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js',
    ],
    function(){
      loadScript(
        [
          'https://unpkg.com/globe.gl@2.26.4/dist/globe.gl.min.js',
          'https://cdn.jsdelivr.net/npm/globe.gl@2.26.4/dist/globe.gl.min.js',
        ],
        function(){
          try { startGlobe(); } catch(e){ post({type:'error', err:'start-fail: '+e.message}); setStatus('Couldn\\'t start globe<br>'+e.message); }
        },
        function(err){ post({type:'error', err:'globe.gl fail: '+err}); setStatus('Offline — can\\'t load globe'); }
      );
    },
    function(err){ post({type:'error', err:'three.js fail: '+err}); setStatus('Offline — can\\'t load 3D engine'); }
  );

  function isClickable(name){
    if(!name) return false;
    name = String(name).toLowerCase();
    for(var i=0;i<CLICKABLES.length;i++){
      if(name.indexOf(CLICKABLES[i])!==-1 || CLICKABLES[i].indexOf(name)!==-1) return true;
    }
    return false;
  }
  function nameOf(f){
    return (f && f.properties && (f.properties.NAME || f.properties.ADMIN || f.properties.name)) || '';
  }

  function startGlobe(){
    if (typeof Globe !== 'function') { setStatus('Globe.js not found'); return; }
    setStatus('<div class="spinner"></div>Painting Earth…');

    var world = Globe()
      (document.getElementById('g'))
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl('https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#6EA8F0')
      .atmosphereAltitude(0.2)
      .pointsData(MARKERS)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor(function(d){ return d.color || '#60A5FA'; })
      .pointAltitude(0.02)
      .pointRadius(function(d){ return d.size || 1.0; })
      .pointLabel(function(d){ return d.label ? '<div style="padding:4px 8px;background:rgba(0,0,0,0.7);color:#fff;border-radius:6px;font-size:12px;">'+d.label+'</div>' : ''; })
      .onPointClick(function(d){ if(d && d.id) post({type:'marker', id:d.id}); })
      .onGlobeReady(function(){ hideStatus(); post({type:'ready'}); });

    world.pointOfView({ lat:${initialLat}, lng:${initialLng}, altitude:2.2 }, 0);

    var controls = world.controls();
    controls.autoRotate = ${autoRotate ? "true" : "false"};
    controls.autoRotateSpeed = 0.4;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = 0.45;

    // Some versions don't expose onGlobeReady — belt-and-braces hideStatus.
    setTimeout(hideStatus, 3500);

    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then(function(r){ return r.json(); })
      .then(function(gj){
        world
          .polygonsData(gj.features)
          .polygonCapColor(function(f){
            // Deep ocean-blue tint on highlighted, invisible everywhere else.
            return isHighlight(nameOf(f)) ? 'rgba(59,130,246,0.55)' : 'rgba(0,0,0,0)';
          })
          .polygonSideColor(function(){ return 'rgba(0,0,0,0)'; })
          .polygonStrokeColor(function(f){
            return isHighlight(nameOf(f)) ? 'rgba(147,197,253,0.95)' : 'rgba(255,255,255,0.06)';
          })
          .polygonAltitude(function(f){
            return isHighlight(nameOf(f)) ? 0.014 : 0.001;
          })
          // Only fire taps for countries actually in our clickable set —
          // otherwise empty ocean or unrelated countries shouldn't trigger
          // popups.
          .onPolygonClick(function(f){
            var n = nameOf(f);
            if (n && isClickable(n)) post({type:'country', name:n});
          })
          // Small lift on hover to signal the country is interactive.
          .polygonsTransitionDuration(250)
          .onPolygonHover(function(hover){
            world.polygonAltitude(function(f){
              if (f === hover && isClickable(nameOf(f))) return 0.032;
              return isHighlight(nameOf(f)) ? 0.014 : 0.001;
            });
          });
        post({type:'polygons-loaded', count: gj.features.length});
      })
      .catch(function(e){ post({type:'polygons-error', err: String(e)}); });

    window.addEventListener('resize', function(){
      world.width(window.innerWidth).height(window.innerHeight);
    });
  }

  post({type:'boot'});
</script>
</body>
</html>`;
  }, [highlightCountries, clickableCountries, markers, initialLat, initialLng, autoRotate, background]);

  const onMessage = (e: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg?.type === "ready") setReady(true);
      if (msg?.type === "error") setError(msg.err || "Globe failed to load");
      if (msg?.type === "marker" && typeof msg.id === "string") onMarkerTap?.(msg.id);
      if (msg?.type === "country" && typeof msg.name === "string") onCountryTap?.(msg.name);
    } catch {
      // ignore
    }
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
        },
      ]}
    >
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={{ width: size, height: size, backgroundColor: "transparent" }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onMessage={onMessage}
        mixedContentMode="always"
        containerStyle={{ backgroundColor: background, width: size, height: size }}
      />
      {!ready && error ? (
        <View style={styles.fallback} pointerEvents="none">
          <Text style={styles.fallbackText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  web: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  fallback: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  } as any,
  fallbackText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
