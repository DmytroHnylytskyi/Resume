import { DeveloperProfile, Locale, Translations } from '../types/portfolio';

export const developerProfiles: Record<Locale, DeveloperProfile> = {
  uk: {
    name: "Дмитро Гнилицький",
    role: "Full-Stack & Creative 3D Developer",
    location: "Київ, Україна (100% Remote)",
    status: "Відкритий до нових пропозицій",
    bio: "Full-Stack інженер із фокусом на сучасних високопродуктивних веб-додатках (React 19 / Next.js 15), асинхронних бекенд-системах (FastAPI / PostgreSQL) та інтерактивній 3D-графіці (Three.js, WebGL, GLSL). Маю практичний досвід розробки складних 3D-конфігураторів, геопросторових систем аналітики та LMS-платформ.",
    summary: [
      "2+ роки продуктової розробки: створення комплексних веб-сервісів від проєктування БД до інтерактивного WebGL-клієнта.",
      "Експертиза у 3D WebGL & Creative Tech: просторові обчислення, Raycasting, процедурні GLSL-шейдери, GPU Instancing та фізика Rapier 3D.",
      "Високопродуктивний асинхронний бекенд: проектування non-blocking API на FastAPI, Async SQLAlchemy 2.0, JWT з ротацією токенів та rate limiting.",
      "Сучасна фронтенд-архітектура: суворий TypeScript, TanStack Query v5 (Optimistic UI), Zustand 5, TailwindCSS та 60 FPS рендеринг."
    ],
    education: [
      {
        institution: "НТУУ «Київський політехнічний інститут імені Ігоря Сікорського» (КПІ)",
        faculty: "НН ІАТЕ (Інститут атомної та теплової енергетики)",
        specialty: "121 «Інженерія програмного забезпечення»",
        degree: "Бакалавр",
        period: "2023 — 2027",
        status: "4 курс (в процесі навчання)",
        location: "Київ, Україна"
      }
    ],
    certifications: [
      {
        id: "hackerrank-react",
        title: "Frontend Developer (React)",
        issuer: "HackerRank",
        level: "Verified Skill",
        category: "Frontend",
        verified: true
      },
      {
        id: "hackerrank-js",
        title: "JavaScript (Intermediate)",
        issuer: "HackerRank",
        level: "Intermediate",
        category: "Frontend",
        verified: true
      },
      {
        id: "hackerrank-node",
        title: "Node.js (Intermediate)",
        issuer: "HackerRank",
        level: "Intermediate",
        category: "Backend",
        verified: true
      },
      {
        id: "hackerrank-sql",
        title: "SQL (Advanced)",
        issuer: "HackerRank",
        level: "Advanced",
        category: "Databases",
        verified: true
      },
      {
        id: "hackerrank-rest",
        title: "REST API (Intermediate)",
        issuer: "HackerRank",
        level: "Intermediate",
        category: "Backend",
        verified: true
      },
      {
        id: "hackerrank-python",
        title: "Python (Basic)",
        issuer: "HackerRank",
        level: "Basic",
        category: "Backend",
        verified: true
      },
      {
        id: "efset-english",
        title: "EF SET English Certificate",
        issuer: "EF Standard English Test",
        level: "International Standard",
        category: "Languages",
        verified: true
      }
    ],
    skills: [
      {
        category: "Frontend Core & State",
        items: ["React 19", "Next.js 15 (App Router)", "TypeScript (Strict)", "JavaScript (ESNext)", "TailwindCSS", "Zustand 5", "TanStack Query v5", "Framer Motion", "HTML5 / CSS3"]
      },
      {
        category: "3D & Creative WebGL",
        items: ["Three.js", "React Three Fiber (R3F)", "Drei", "Rapier 3D Physics", "Custom GLSL Shaders", "Raycasting & Snapping", "GPU Instancing", "Blender"]
      },
      {
        category: "Backend & Databases",
        items: ["Python 3.12+", "FastAPI (Async)", "Async SQLAlchemy 2.0", "PostgreSQL 16 (asyncpg)", "SQLite (aiosqlite)", "Node.js", "Express", "Alembic"]
      },
      {
        category: "DevOps & Architecture",
        items: ["Docker & Compose", "Git & GitHub", "Vite", "REST API Design", "JWT Auth (Token Rotation)", "Cloudinary CDN", "SlowAPI (Rate Limiting)"]
      }
    ],
    contacts: {
      email: "dmitrijgnilickij7@gmail.com",
      telegram: "https://t.me/mokydjin",
      github: "https://github.com/DmytroHnylytskyi",
      linkedin: "https://github.com/DmytroHnylytskyi"
    },
    projects: {
      forma: {
        id: "forma",
        title: "Forma-3D (Spatial Builder & Object Configurator)",
        tagline: "Модульний 3D-редактор простору та універсальний конфігуратор об'єктів",
        description: "Комерційно-орієнтований full-stack 3D-редактор сцени та просторовий конфігуратор для будь-яких 3D-об'єктів (меблі, архітектура, декор) з автоматичним стекуванням поверхонь, гнучким налаштуванням матеріалів та хмарною синхронізацією.",
        tags: ["Three.js", "React Three Fiber", "Next.js 15", "TypeScript", "FastAPI", "PostgreSQL", "Docker"],
        url: "http://localhost:3001",
        githubUrl: "https://github.com/DmytroHnylytskyi",
        color: "#34d399",
        features: [
          "Алгоритм Surface Snapping (Raycasting) для автоматичного розміщення та стекування об'єктів на поверхнях",
          "Режим польоту камери у стилі Unreal Engine 5 (RMB + WASD + Shift Boost + Focus F)",
          "Динамічна зміна матеріалів суб-мешів (кольори, текстури, метал, дерево) у реальному часі",
          "Асинхронний бекенд на FastAPI + PostgreSQL з JWT-авторизацією та збереженням сцен"
        ]
      },
      terrascope: {
        id: "terrascope",
        title: "TerraScope (3D Geospatial Intelligence)",
        tagline: "Інтерактивна 3D-платформа геопросторової візуалізації та супутникових даних",
        description: "Апаратна 3D-візуалізація планети Земля з кастомними GLSL-шейдерами атмосфери та шарами супутникових даних у реальному часі зі стабільними 60 FPS.",
        tags: ["Three.js", "GLSL Shaders", "Next.js 15", "FastAPI", "Zustand 5", "Docker"],
        url: "http://localhost:3002",
        githubUrl: "https://github.com/DmytroHnylytskyi",
        color: "#60a5fa",
        features: [
          "Кастомний GLSL Day/Night Terminator шейдер із реальним розрахунком сонячного світла та Fresnel світіння",
          "GPU Instanced шари даних: живі землетруси (USGS), авіарейси (OpenSky), погода (Open-Meteo), астероїди (NASA NEOs)",
          "Захист від Cache Stampede на бекенді через asyncio.Lock для високошвидкісного кешування"
        ]
      },
      lumina: {
        id: "lumina",
        title: "Lumina (Full-Stack LMS Learning Platform)",
        tagline: "Сучасна асинхронна освітня платформа дистанційного навчання",
        description: "Освітня система для викладачів і студентів із модульними інтерактивними курсами, системою дедлайнів, завантаженням домашніх робіт та візуальною аналітикою прогресу.",
        tags: ["React 19", "Vite", "TanStack Query v5", "FastAPI", "PostgreSQL", "TailwindCSS"],
        url: "http://localhost:3003",
        githubUrl: "https://github.com/DmytroHnylytskyi",
        color: "#fb7185",
        features: [
          "Оптимістичний UI та миттєве кешування стану на клієнті через TanStack Query v5",
          "Рольова модель (Студент / Викладач) із захистом маршрутів та ротацією JWT токенів",
          "Інтерактивний медіаплеєр уроків із підтримкою відео, PDF, Google Drive та Cloudinary",
          "Аналітичні графіки успішності та динаміка навчання на базі Recharts"
        ]
      }
    }
  },
  en: {
    name: "Dmytro Hnylytskyi",
    role: "Full-Stack & Creative 3D Developer",
    location: "Kyiv, Ukraine (100% Remote)",
    status: "Open to Remote Opportunities",
    bio: "Full-Stack engineer specializing in high-performance modern web applications (React 19 / Next.js 15), asynchronous backend architectures (FastAPI / PostgreSQL), and interactive 3D WebGL experiences (Three.js / React Three Fiber / GLSL). Hands-on experience building complex 3D configurators, geospatial analytics engines, and educational LMS platforms.",
    summary: [
      "2+ years of hands-on product engineering: crafting complete web applications from database schemas to interactive WebGL clients.",
      "Creative 3D & WebGL mastery: spatial computing, raycasting engines, custom GLSL procedural shaders, GPU instancing, and Rapier 3D physics.",
      "High-concurrency backend design: building non-blocking FastAPI services, Async SQLAlchemy 2.0, JWT auth with token rotation, and rate limiting.",
      "Modern frontend architecture: strict TypeScript, TanStack Query v5 (Optimistic UI), Zustand 5, TailwindCSS, and locked 60 FPS WebGL."
    ],
    education: [
      {
        institution: "National Technical University of Ukraine 'Igor Sikorsky Kyiv Polytechnic Institute' (KPI)",
        faculty: "Institute of Atomic and Thermal Energy (IATE)",
        specialty: "121 'Software Engineering'",
        degree: "Bachelor's Degree",
        period: "2023 — 2027",
        status: "4th Year (In progress)",
        location: "Kyiv, Ukraine"
      }
    ],
    certifications: [
      {
        id: "hackerrank-react",
        title: "Frontend Developer (React)",
        issuer: "HackerRank",
        level: "Verified Skill",
        category: "Frontend",
        verified: true
      },
      {
        id: "hackerrank-js",
        title: "JavaScript (Intermediate)",
        issuer: "HackerRank",
        level: "Intermediate",
        category: "Frontend",
        verified: true
      },
      {
        id: "hackerrank-node",
        title: "Node.js (Intermediate)",
        issuer: "HackerRank",
        level: "Intermediate",
        category: "Backend",
        verified: true
      },
      {
        id: "hackerrank-sql",
        title: "SQL (Advanced)",
        issuer: "HackerRank",
        level: "Advanced",
        category: "Databases",
        verified: true
      },
      {
        id: "hackerrank-rest",
        title: "REST API (Intermediate)",
        issuer: "HackerRank",
        level: "Intermediate",
        category: "Backend",
        verified: true
      },
      {
        id: "hackerrank-python",
        title: "Python (Basic)",
        issuer: "HackerRank",
        level: "Basic",
        category: "Backend",
        verified: true
      },
      {
        id: "efset-english",
        title: "EF SET English Certificate",
        issuer: "EF Standard English Test",
        level: "International Standard",
        category: "Languages",
        verified: true
      }
    ],
    skills: [
      {
        category: "Frontend Core & State",
        items: ["React 19", "Next.js 15 (App Router)", "TypeScript (Strict)", "JavaScript (ESNext)", "TailwindCSS", "Zustand 5", "TanStack Query v5", "Framer Motion", "HTML5 / CSS3"]
      },
      {
        category: "3D & Creative WebGL",
        items: ["Three.js", "React Three Fiber (R3F)", "Drei", "Rapier 3D Physics", "Custom GLSL Shaders", "Raycasting & Snapping", "GPU Instancing", "Blender"]
      },
      {
        category: "Backend & Databases",
        items: ["Python 3.12+", "FastAPI (Async)", "Async SQLAlchemy 2.0", "PostgreSQL 16 (asyncpg)", "SQLite (aiosqlite)", "Node.js", "Express", "Alembic"]
      },
      {
        category: "DevOps & Architecture",
        items: ["Docker & Compose", "Git & GitHub", "Vite", "REST API Design", "JWT Auth (Token Rotation)", "Cloudinary CDN", "SlowAPI (Rate Limiting)"]
      }
    ],
    contacts: {
      email: "dmitrijgnilickij7@gmail.com",
      telegram: "https://t.me/mokydjin",
      github: "https://github.com/DmytroHnylytskyi",
      linkedin: "https://github.com/DmytroHnylytskyi"
    },
    projects: {
      forma: {
        id: "forma",
        title: "Forma-3D (Spatial Builder & Object Configurator)",
        tagline: "Modular 3D spatial scene builder & universal object configurator",
        description: "Commercial-grade full-stack 3D interior & spatial room configurator for placing, stacking, and customizing any 3D assets with real-time materials swapping, surface raycasting, and async cloud synchronization.",
        tags: ["Three.js", "React Three Fiber", "Next.js 15", "TypeScript", "FastAPI", "PostgreSQL", "Docker"],
        url: "http://localhost:3001",
        githubUrl: "https://github.com/DmytroHnylytskyi",
        color: "#34d399",
        features: [
          "Raycasting Surface Snapping for automatic object positioning and height stacking",
          "Unreal Engine 5 style freefly camera controls (RMB + WASD + Shift Speed Boost + Focus F)",
          "Real-time sub-mesh material and color swapping (wood, leather, metal, custom hues)",
          "Fully asynchronous backend powered by FastAPI + PostgreSQL with JWT auth and scene sync"
        ]
      },
      terrascope: {
        id: "terrascope",
        title: "TerraScope (3D Geospatial Intelligence)",
        tagline: "Interactive 3D geospatial intelligence and live satellite analytics",
        description: "Hardware-accelerated 3D planetary Earth visualization with custom atmospheric GLSL shaders, orbital navigation, and real-time live data layers locked at 60 FPS.",
        tags: ["Three.js", "GLSL Shaders", "Next.js 15", "FastAPI", "Zustand 5", "Docker"],
        url: "http://localhost:3002",
        githubUrl: "https://github.com/DmytroHnylytskyi",
        color: "#60a5fa",
        features: [
          "Custom GLSL Day/Night Terminator shader with dynamic solar computation and Fresnel atmosphere glow",
          "GPU-instanced data layers: USGS earthquakes, OpenSky live flights, Open-Meteo weather, and NASA NEOs",
          "Cache stampede protection on FastAPI backend via asyncio.Lock for high-throughput caching"
        ]
      },
      lumina: {
        id: "lumina",
        title: "Lumina (Full-Stack LMS Learning Platform)",
        tagline: "Modern asynchronous e-learning and student management platform",
        description: "Comprehensive educational platform featuring interactive course authoring, automated testing, homework submission pipelines, and visual progress analytics.",
        tags: ["React 19", "Vite", "TanStack Query v5", "FastAPI", "PostgreSQL", "TailwindCSS"],
        url: "http://localhost:3003",
        githubUrl: "https://github.com/DmytroHnylytskyi",
        color: "#fb7185",
        features: [
          "Optimistic UI and instant client state caching via TanStack Query v5",
          "Role-based access (Student / Teacher) with JWT rotation and rate limiting",
          "Interactive lesson media player supporting video, PDF, Google Drive, and Cloudinary CDN",
          "Visual student progress curves and study schedules powered by Recharts"
        ]
      }
    }
  }
};

export const translations: Record<Locale, Translations> = {
  uk: {
    nav: {
      brandTag: "Aetheria 3D",
      bio: "Про мене",
      skills: "Навички",
      contacts: "Контакти",
      view3D: "3D Світ",
      viewClassic: "Резюме",
      resumeTitle: "Портфоліо"
    },
    welcome: {
      title: "Ласкаво просимо до Aetheria",
      subtitle: "Інтерактивне 3D-портфоліо та резюме Дмитра Гнилицького",
      chooseMode: "Оберіть зручний формат ознайомлення:",
      mode3DTitle: "3D Інтерактивний світ",
      mode3DDesc: "Досліджуйте 3D-острів, керуйте персонажем та взаємодійте з порталами проєктів та статуями знань.",
      mode3DBtn: "Увійти в 3D світ",
      modeClassicTitle: "Класичне Резюме",
      modeClassicDesc: "Швидкий та зручний формат звичного лендінгу з детальним описом досвіду, освіти, сертифікатів та проєктів.",
      modeClassicBtn: "Читати як Резюме",
      selectLanguage: "Мова / Language"
    },
    loading: {
      title: "Завантаження світу...",
      subtitle: "Компіляція 3D-ассетів, текстур та фізики острова",
      tip: "Порада: Ви можете перемикатися між 3D та класичним резюме у будь-який момент."
    },
    landing: {
      heroGreeting: "Привіт, я",
      availableForWork: "100% Remote • Відкритий до пропозицій",
      contactMe: "Зв'язатися",
      viewIn3D: "Відкрити в 3D",
      aboutTitle: "Про мене",
      aboutSubtitle: "Інженерний підхід, архітектура та ключові компетенції",
      educationTitle: "Освіта & Академічний бекграунд",
      educationSubtitle: "Профільна вища інженерна освіта",
      certificationsTitle: "Підтверджені Сертифікації",
      certificationsSubtitle: "Міжнародні та технічні оцінки кваліфікації (HackerRank & EF SET)",
      skillsTitle: "Стек & Навички",
      skillsSubtitle: "Технології та інструменти, з якими я будую щодня",
      projectsTitle: "Вибрані Проєкти",
      projectsSubtitle: "Реальні full-stack та 3D-інженерні рішення",
      keyFeatures: "Ключові архітектурні фічі:",
      liveDemo: "Переглянути проєкт",
      sourceCode: "Вихідний код",
      contactsTitle: "Контакти",
      contactsSubtitle: "Завжди відкритий до цікавих віддалених проєктів та пропозицій",
      copyEmail: "Скопіювати Email",
      copied: "Скопійовано!",
      openLink: "Відкрити",
      rightsReserved: "Усі права захищено."
    },
    modals: {
      close: "Закрити",
      biography: "Біографія та Інженерний Досвід",
      skillsAndTech: "Стек технологій & Сертифікати",
      contactsAndSocial: "Контакти та Зв'язок",
      education: "Освіта",
      certifications: "Сертифікації",
      projectDetails: "Деталі Проєкту",
      visitSite: "Відвідати сайт",
      viewDemo: "Live Demo",
      viewCode: "GitHub Репозиторій",
      copySuccess: "Скопійовано в буфер!",
      statusLabel: "Статус доступності"
    },
    interaction: {
      actionKey: "E",
      interact: "Взаємодія",
      statueBio: "Статуя Біографії",
      statueSkills: "Вівтар Навичок",
      statueContacts: "Статуя Контактів",
      portalForma: "Портал: Forma-3D",
      portalTerrascope: "Портал: TerraScope",
      portalLumina: "Портал: Lumina"
    }
  },
  en: {
    nav: {
      brandTag: "Aetheria 3D",
      bio: "About Me",
      skills: "Skills",
      contacts: "Contacts",
      view3D: "3D World",
      viewClassic: "Resume",
      resumeTitle: "Portfolio"
    },
    welcome: {
      title: "Welcome to Aetheria",
      subtitle: "Interactive 3D Portfolio & Resume of Dmytro Hnylytskyi",
      chooseMode: "Choose your preferred viewing experience:",
      mode3DTitle: "Interactive 3D World",
      mode3DDesc: "Explore the 3D island, control your character, and interact with project portals and skill altars.",
      mode3DBtn: "Enter 3D World",
      modeClassicTitle: "Classic Resume",
      modeClassicDesc: "Fast and structured web landing page with complete overview of experience, education, certificates, and projects.",
      modeClassicBtn: "Read Classic Resume",
      selectLanguage: "Language / Мова"
    },
    loading: {
      title: "Loading 3D World...",
      subtitle: "Compiling shaders, 3D assets, and physics simulation",
      tip: "Tip: You can toggle between 3D world and classic resume anytime from the top bar."
    },
    landing: {
      heroGreeting: "Hello, I am",
      availableForWork: "100% Remote • Open to Opportunities",
      contactMe: "Get in Touch",
      viewIn3D: "Explore in 3D",
      aboutTitle: "About Me",
      aboutSubtitle: "Engineering philosophy, architecture, and core focus",
      educationTitle: "Education & Academic Background",
      educationSubtitle: "Formal software engineering higher education",
      certificationsTitle: "Verified Certifications",
      certificationsSubtitle: "International & technical skill assessments (HackerRank & EF SET)",
      skillsTitle: "Tech Stack & Skills",
      skillsSubtitle: "Technologies and tools I use on a daily basis",
      projectsTitle: "Featured Projects",
      projectsSubtitle: "Real-world full-stack & 3D engineering applications",
      keyFeatures: "Key Highlights:",
      liveDemo: "View Project",
      sourceCode: "Source Code",
      contactsTitle: "Contact & Links",
      contactsSubtitle: "Always open to exciting remote roles & engineering collaborations",
      copyEmail: "Copy Email",
      copied: "Copied!",
      openLink: "Open Link",
      rightsReserved: "All rights reserved."
    },
    modals: {
      close: "Close",
      biography: "Biography & Background",
      skillsAndTech: "Skills & Verified Credentials",
      contactsAndSocial: "Contacts & Direct Reach",
      education: "Education",
      certifications: "Certifications",
      projectDetails: "Project Details",
      visitSite: "Visit Website",
      viewDemo: "Live Demo",
      viewCode: "Source Code",
      copySuccess: "Copied to clipboard!",
      statusLabel: "Current Availability"
    },
    interaction: {
      actionKey: "E",
      interact: "Interact",
      statueBio: "Biography Statue",
      statueSkills: "Skills Altar",
      statueContacts: "Contacts Statue",
      portalForma: "Portal: Forma-3D",
      portalTerrascope: "Portal: TerraScope",
      portalLumina: "Portal: Lumina"
    }
  }
};

// Helper for backward compatibility
export const developerProfile = developerProfiles.uk;
