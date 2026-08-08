import { DeveloperProfile } from '../types/portfolio';

export const developerProfile: DeveloperProfile = {
  name: "Гнилицький Дмитро",
  nameEn: "Dmytro Hnylytskyi",
  title: "Full-Stack & 3D WebGL Developer",
  tagline: "Розробник інтерактивних 3D веб-додатків, високопродуктивних систем та сучасних інтерфейсів",
  university: {
    fullName: "КПІ ім. Ігоря Сікорського",
    institute: "НН ІАТЕ (Навчально-науковий інститут атомної та теплової енергетики)",
    department: "Кафедра інженерії програмного забезпечення в енергетиці (ІПЗЕ)",
    specialty: "121 — Інженерія програмного забезпечення",
    year: "Студент бакалаврату",
    degree: "Software Engineering"
  },
  contacts: {
    email: "dmitrijgnilickij7@gmail.com",
    telegram: "@mokydjin",
    telegramUrl: "https://t.me/mokydjin",
    phone: "+380996018342",
    phoneFormatted: "+380 (99) 601-83-42",
    github: "https://github.com/mokydjin",
    linkedin: "https://www.linkedin.com/in/dmytro-hnylytskyi",
    location: "Київ, Україна",
    status: "Open for Opportunities / Готовий до нових проєктів"
  },
  about: [
    "Привіт! Я захоплений розробкою веб-додатків нового покоління, поєднуючи сучасний Full-Stack стек з інтерактивною 3D-графікою (Three.js / React Three Fiber / WebGL) та фізикою в реальному часі.",
    "Навчаюся в КПІ ім. Ігоря Сікорського (спеціальність 121 «Інженерія програмного забезпечення»), де глибоко вивчаю архітектуру ПЗ, алгоритми, розподілені системи та інженерні стандарти.",
    "Моя пристрасть — створення продуктів, які вражають з першого погляду: від високонавантажених геопросторових 3D-платформ з кастомними шейдерами до повноцінних конфігураторів та LMS платформ із заблокованими 60 FPS."
  ],
  skillsMatrix: {
    "3D Graphics & WebGL": [
      { name: "Three.js / WebGL", level: 95, icon: "Box", desc: "Сцени, освітлення, кастомні GLSL шейдери, оптимізація мешів" },
      { name: "React Three Fiber (R3F)", level: 95, icon: "Cuboid", desc: "Декларативні 3D-сцени, Drei хелпери, інстансинг" },
      { name: "Rapier 3D Physics", level: 90, icon: "Activity", desc: "Trimesh колізії, динамічні RigidBody, контролери персонажів" },
      { name: "GLTF / GLB Optimization", level: 88, icon: "Layers", desc: "Draco компресія, текстурний атлас, оптимізація draw calls" }
    ],
    "Frontend Core & UI": [
      { name: "React 19 / Next.js 15+", level: 96, icon: "Code2", desc: "App Router, SSR, Server Actions, Client Components" },
      { name: "TypeScript & JavaScript ES6+", level: 94, icon: "FileCode", desc: "Типізація, асинхронні пайплайни, оптимізація пам'яті" },
      { name: "Zustand & State Management", level: 92, icon: "Database", desc: "Глобальний стан, селектори, персистентність" },
      { name: "Framer Motion & CSS Aesthetics", level: 95, icon: "Sparkles", desc: "Glassmorphism, плавні переходи, мікроанімації" }
    ],
    "Backend & Architecture": [
      { name: "Python / FastAPI", level: 88, icon: "Terminal", desc: "REST API, WebSocket стрімінг, асинхронні воркери" },
      { name: "Node.js / Express", level: 86, icon: "Server", desc: "Бекенд сервіси, JWT авторизація, кешування" },
      { name: "SQL & Databases", level: 85, icon: "HardDrive", desc: "SQLite, PostgreSQL, оптимізація запитів" },
      { name: "Docker & CI/CD", level: 82, icon: "Cpu", desc: "Контейнеризація, деплой, збірки" }
    ]
  },
  projects: [
    {
      id: "globescope",
      title: "GlobeScope",
      subtitle: "3D Geospatial Intelligence Platform",
      portalKey: "globescope",
      themeColor: "#38bdf8",
      accentGlow: "rgba(56, 189, 248, 0.4)",
      badge: "Real-time 3D Earth",
      url: "http://localhost:3001",
      description: "Високопродуктивна 3D-платформа візуалізації планети на базі Next.js 15, R3F та FastAPI. Рендерить динамічні глобальні дані (землетруси USGS, літаки OpenSky в реальному часі, погоду 177 столиць та астероїди NASA) за допомогою GPU-інстансингу та кастомних GLSL шейдерів атмосфери.",
      tags: ["Next.js 15", "Three.js (R3F)", "FastAPI", "GLSL Shaders", "SQLite", "Zustand"]
    },
    {
      id: "furniture",
      title: "3D Furniture Configurator",
      subtitle: "Architectural & Interior Design Studio",
      portalKey: "furniture",
      themeColor: "#fbbf24",
      accentGlow: "rgba(251, 191, 36, 0.4)",
      badge: "Full 3D Editor",
      url: "http://localhost:3000",
      description: "Інтерактивний 3D-конфігуратор меблів та архітектурних блоків. Дозволяє розміщувати понад 60+ об'єктів, налаштовувати матеріали й текстури, трансформувати з Magnet Snap до сітки та експортувати/імпортувати просторові сцени в JSON.",
      tags: ["React 19", "R3F / Drei", "Dynamic Lighting", "State Persistence", "i18n Bilingual"]
    },
    {
      id: "minilms",
      title: "MiniLMS",
      subtitle: "Next-Gen Learning Platform",
      portalKey: "minilms",
      themeColor: "#a855f7",
      accentGlow: "rgba(168, 85, 247, 0.4)",
      badge: "Cyber Academy",
      url: "http://localhost:5174",
      description: "Сучасна модульна система управління навчанням (LMS) з інтерактивними курсами, квізами, відстеженням прогресу студентів, мультиязичністю та блискавичним інтерфейсом.",
      tags: ["React + Vite", "Modular Architecture", "Interactive Quizzes", "Design System", "i18n"]
    }
  ]
};
