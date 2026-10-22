/**
 * debugState.ts — мост рантайм-отладки карты за ?debug=1.
 *
 * Содержит только мутируемое состояние и функцию телепорта, которую
 * CharacterController registers on mount. Production-клиент платит нулевую
 * цену: оверлей физики монтируется лишь при `?debug=1`, а мост читается
 * только из кода, который и так крутится в кадровом цикле.
 */

export interface DebugColliderSnapshot {
  id: string;
  kind: string;
  halfExtents: [number, number, number];
  position: [number, number, number];
}

/** ?debug=1 — единственный гейт всей отладочной инфраструктуры (ноль в проде). */
export const DEBUG_MODE =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

/** QA-камера: при active кадровый цикл ставит её после контроллера игрока. */
export const debugCameraState = {
  active: false,
  position: [0, 30, 50] as [number, number, number],
  target: [0, 0, 0] as [number, number, number]
};

export const debugBridge = {
  /** Бонусные данные по игроку, обновляются в useFrame если debugOverlayOn. */
  x: 0,
  y: 0,
  z: 0,
  /** Ставит CharacterController при монтировании — телепорт из консоли. */
  teleport: null as null | ((x: number, y: number, z: number) => void),
  /** Ставит CharacterController — навести камеру: yaw/pitch в радианах, дистанция в метрах. */
  setCamera: null as null | ((yaw: number, pitch: number, distance?: number) => void),
  /** Ставит WorldScene при монтировании — включить/выключить каркасы коллайдеров. */
  showColliders: null as null | ((on: boolean) => void),
  /** Ставит WorldScene — список коллайдеров в радиусе от игрока. */
  listNear: null as null | ((radius?: number) => DebugColliderSnapshot[])
};

// ── Качество рендера (?q=high|low) ──
// Пресет читается ОДИН раз при монтировании канваса (переключение теней в
// рантайме форсит перекомпиляцию всех материалов — поэтому это не рантайм-
// флаг, а режим запуска).
//
// high: тени, MeshStandardMaterial, полный световой риг.
// low:  без теней, MeshLambertMaterial для всей геометрии (дешевле шейдер),
//       меньше света, ниже DPR, без сглаживания, реже частицы.
//
// Автовыбор: мобильные/тач-устройства, слабые iGPU и софтверный рендер
// (SwiftShader/llvmpipe) получают low сразу — «открывается на тостере».
// ?q=high / ?q=low переопределяют детект для проверки глазами.
export type QualityTier = 'low' | 'medium' | 'high';

/**
 * Три уровня качества вместо бинарного low/high.
 *
 * Прежняя ошибка: любой `pointer: coarse` сразу давал low. Флагманский
 * телефон получал DPR 1.0 и выключенный AA — рендер вчетверо меньше пикселей,
 * чем умеет экран, и «ужасно пиксельную» картинку, хотя по железу он мощнее
 * иного ноутбука. Теперь тип указателя влияет только на UI и политику AA,
 * а уровень определяют GPU, ядра и память.
 */
function detectQuality(): {
  tier: QualityTier;
  reason: string;
  touch: boolean;
  coarse: boolean;
} {
  if (typeof window === 'undefined') {
    return { tier: 'low', reason: 'ssr', touch: false, coarse: false };
  }

  const params = new URLSearchParams(window.location.search);
  const override = params.get('q');
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 0;
  const memory = nav.deviceMemory || 0;
  const nativeDpr = window.devicePixelRatio || 1;

  // HANDHELD ≠ coarse pointer. Телефон в desktop-mode (или с подключённой
  // мышью/стилусом) отдаёт `pointer: fine`, и прежняя проверка ошибочно
  // включала ему 4096²-запечку планеты — на мобильном GPU это блокировало
  // поток на время запечки (та самая «зависшая» заставка). Считаем handheld
  // по совокупности признаков; coarse оставляем только для политики AA.
  const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
  const maxTouch = nav.maxTouchPoints || 0;
  const handheld =
    coarse ||
    maxTouch > 0 ||
    /android|iphone|ipad|ipod|mobile|silk|kindle/i.test(nav.userAgent) ||
    (window.innerWidth <= 900 && nativeDpr >= 2);

  if (override === 'low' || override === 'medium' || override === 'high') {
    return { tier: override, reason: 'url', touch: handheld, coarse };
  }

  let renderer = '';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = String(
        ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || ''
      );
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    }
  } catch (_) {
    /* детект не удался — ниже решат ядра/память */
  }
  const gpu = renderer.toLowerCase();

  if (/swiftshader|llvmpipe|software|basic render/.test(gpu)) {
    return { tier: 'low', reason: 'software-gpu', touch: handheld, coarse };
  }

  if (handheld) {
    // Топовые мобильные GPU: Apple, Adreno 7xx/8xx, Mali-G7xx/G8xx,
    // Immortalis, Xclipse. Заведомо мощнее «слабого» десктопа.
    if (
      /apple gpu|apple m\d|adreno.*\b[78]\d{2}\b|mali-g[789]\d|immortalis|xclipse/.test(gpu) ||
      // iOS иногда скрывает GPU-строку: Retina-устройство Apple заведомо
      // тянет полный пресет (адаптивный DPR подстрахует по FPS).
      (/iphone|ipad|ipod/.test(nav.userAgent) && nativeDpr >= 2)
    ) {
      return { tier: 'high', reason: 'mobile-gpu', touch: true, coarse };
    }
    // Средний мобильный класс: Adreno 6xx, Mali-G5x/G6x, PowerVR.
    if (/adreno.*\b[56]\d{2}\b|mali-[gt][5-8]\d|powervr/.test(gpu)) {
      return { tier: 'medium', reason: 'mobile-gpu', touch: true, coarse };
    }
    // GPU-строку на iOS/Android иногда маскируют: решают ядра/память/DPR.
    if (cores >= 8 || memory >= 8 || nativeDpr >= 3) {
      return { tier: 'medium', reason: 'device-specs', touch: true, coarse };
    }
    return { tier: 'low', reason: 'mobile-unknown', touch: true, coarse };
  }

  // Десктоп: дискретные GPU и Apple Silicon.
  if (/nvidia|geforce|rtx|gtx|quadro|radeon|apple m\d|arc\(tm\)|iris xe/.test(gpu)) {
    return { tier: 'high', reason: 'desktop-gpu', touch: false, coarse };
  }
  // Intel HD/UHD 5xx-6xx — прежний «слабый» десктоп: оставляем low, чтобы не
  // включать тени/PBR там, где раньше было 60 FPS.
  if (/intel.*(hd|uhd) graphics (5|6)\d{2}/.test(gpu)) {
    return { tier: 'low', reason: 'weak-gpu', touch: false, coarse };
  }
  if (cores > 0 && cores <= 4) return { tier: 'low', reason: `cores:${cores}`, touch: false, coarse };
  if (memory > 0 && memory <= 4) return { tier: 'low', reason: `memory:${memory}`, touch: false, coarse };
  return { tier: 'medium', reason: 'desktop-unknown', touch: false, coarse };
}

const DETECTED = detectQuality();
const TIER = DETECTED.tier;
const HIGH = TIER === 'high';
const MEDIUM = TIER === 'medium';
const LOW = TIER === 'low';
const TOUCH = DETECTED.touch;
const COARSE = DETECTED.coarse;
const NATIVE_DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

export const visualQuality: {
  tier: QualityTier;
  /** Handheld/тач-устройство: телефон ≠ слабое железо, но 4096² ему нельзя. */
  touch: boolean;
  /** Именно `pointer: coarse` — для политики MSAA. */
  coarsePointer: boolean;
  nativeDpr: number;
  reason: string;
  shadows: boolean;
  shadowMapSize: number;
  /** Потолок DPR: на телефоне высокий, чтобы не рендерить «мыло» в 1×. */
  dprCap: number;
  dprFloor: number;
  /** Lambert вместо Standard для всей статики и персонажей (low). */
  cheapMaterials: boolean;
  /** Сколько активных источников света держать (sun/moon/ambient всегда). */
  extraLights: boolean;
  starCount: number;
  dustCount: number;
  dustEveryOtherFrame: boolean;
  /** MSAA: только десктоп. На телефоне резкость даёт DPR, а MSAA дорог. */
  antialias: boolean;
  /** Крупные визуальные эффекты (кольца сингулярности, большие ореолы ламп). */
  richEffects: boolean;
  /** 4096²-запечка планеты: только мощный десктоп (на iGPU был драйверный залип). */
  planetHighRes: boolean;
} = {
  tier: TIER,
  touch: TOUCH,
  coarsePointer: COARSE,
  nativeDpr: NATIVE_DPR,
  reason: DETECTED.reason,
  shadows: HIGH,
  // На телефоне тени дороже по fill rate: 1024 вместо 1536 при том же
  // визуальном языке (мягкие контактные тени на стилизованных формах).
  shadowMapSize: HIGH ? (TOUCH ? 1024 : 1536) : 0,
  dprCap: HIGH
    ? Math.min(NATIVE_DPR, TOUCH ? 2.0 : 1.5)
    : MEDIUM
      ? Math.min(NATIVE_DPR, 1.5)
      : 1.0,
  dprFloor: HIGH ? (TOUCH ? 0.75 : 0.85) : MEDIUM ? 0.7 : 0.6,
  cheapMaterials: LOW,
  extraLights: HIGH,
  starCount: HIGH ? 1400 : MEDIUM ? 1100 : 700,
  dustCount: HIGH ? 1000 : MEDIUM ? 650 : 350,
  dustEveryOtherFrame: LOW,
  antialias: !COARSE,
  richEffects: !LOW,
  planetHighRes: HIGH && !TOUCH
};

if (typeof window !== 'undefined') {
  // Видно в консоли, почему выбран уровень (полевая диагностика).
  console.info(
    `[Aetheria] quality=${visualQuality.tier} (${visualQuality.reason}) handheld=${visualQuality.touch} coarse=${visualQuality.coarsePointer}`
  );
}
