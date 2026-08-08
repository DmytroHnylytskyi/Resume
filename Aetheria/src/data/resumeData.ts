import { DeveloperProfile } from '../types/portfolio';

/**
 * Developer Profile & Portfolio Projects for Dmytro Hnylytskyi:
 * - 1. Lumina (Next-Gen Microlearning & Knowledge Platform)
 * - 2. Forma 3D (Spatial Interior & Architectural Configurator)
 * - 3. TerraScope (3D Earth & Geospatial Telemetry Analytics)
 * - 4. Aetheria (Celestial 3D Portfolio Archipelago)
 */
export const developerProfile: DeveloperProfile = {
  name: 'Гнилицький Дмитро',
  nameEn: 'Dmytro Hnylytskyi',
  title: 'Full Stack & 3D Web Engineer (WebGL / React / Next.js / TypeScript)',
  tagline: 'Розробка високонавантажених веб-систем, 3D WebGL інтерактивів та сучасних веб-додатків',

  university: {
    fullName: 'Національний технічний університет України «Київський політехнічний інститут імені Ігоря Сікорського»',
    institute: 'ІАТЕ (Навчально-науковий інститут атомної та теплової енергетики)',
    department: 'Кафедра цифрових технологій в енергетиці / Інженерії програмного забезпечення (ІПЗЕ)',
    specialty: '121 «Інженерія програмного забезпечення»',
    year: '3-й курс (2022–2026)',
    degree: 'Бакалавр інженерії програмного забезпечення'
  },

  contacts: {
    email: 'dmitriy070505@gmail.com',
    telegram: '@mokydjin',
    telegramUrl: 'https://t.me/mokydjin',
    phone: '+380 (96) 538-41-45',
    phoneFormatted: '+380965384145',
    github: 'https://github.com/Dmytrossss',
    linkedin: 'https://linkedin.com/in/dmytro-hnylytskyi',
    location: 'Київ, Україна',
    status: 'Відкритий до комерційних оферів та інженерних викликів'
  },

  about: [
    'Software Engineer з глибокою експертизою у побудові архітектури сучасних веб-додатків, 3D просторових інтерактивів на Three.js / WebGL та високопродуктивних бекендів на FastAPI, Node.js та PostgreSQL.',
    'Навчаюся в КПІ ім. Ігоря Сікорського на кафедрі Інженерії програмного забезпечення (121 ІПЗЕ). Володію системним інженерним мисленням, поєднуючи міцну математичну базу з практичним досвідом створення складних комерційних систем.',
    'Маю практичний досвід створення модульних 3D-конфігураторів реального часу, геопросторових візуалізацій великих даних (Geospatial Big Data), мікросервісних платформ навчання з адаптивними алгоритмами та інтерактивних 3D-світів з фізикою Rapier 3D.',
    'Пишу чистий, масштабований код на TypeScript, дотримуюся принципів Clean Architecture, DDD, SOLID, налаштовую автоматизовані CI/CD пайплайни та оптимізую WebGL продуктивність до стабільних 60+ FPS на мобільних і десктопних пристроях.'
  ],

  skillsMatrix: {
    '3D Graphics & GameDev': [
      { name: 'Three.js / WebGL', level: 92, desc: 'PBR освітлення, кастомні GLSL шейдери, оптимізація геометрії та текстур' },
      { name: 'React Three Fiber & Drei', level: 90, desc: 'Декларативні 3D сцени, CameraControls, IBL оточення' },
      { name: 'Rapier 3D / PhysX', level: 88, desc: 'WASM фізичний рушій, кінематика, тримеш-коллайдери, гравітація' },
      { name: 'Blender 3D Asset Pipeline', level: 82, desc: 'Оптимізація GLB/GLTF, розгортки, UV-мапінг, запікання PBR текстур' }
    ],
    'Frontend & Architecture': [
      { name: 'TypeScript / JavaScript (ESNext)', level: 95, desc: 'Сувора типізація, дженеріки, AST-моделі, асинхронні патерни' },
      { name: 'React 19 & Next.js 15', level: 94, desc: 'App Router, Server Components, SSR, Server Actions, оптимізація бандлів' },
      { name: 'State Management (Zustand / Redux)', level: 92, desc: 'Асинхронні стори, селектори, персистентність, атомарні мутації' },
      { name: 'Tailwind CSS & Glassmorphism', level: 90, desc: 'Сучасні дизайн-системи, CSS-анімації, адаптивність, Web Accessibility' }
    ],
    'Backend & Databases': [
      { name: 'Python 3.12 / FastAPI', level: 90, desc: 'Асинхронні ендпоінти, Pydantic v2 валідація, Dependency Injection, Celery' },
      { name: 'PostgreSQL / SQLAlchemy 2.0', level: 88, desc: 'Складні SQL-запити, індексація, міграції Alembic, оптимізація транзакцій' },
      { name: 'Node.js / Express', level: 85, desc: 'REST API, WebSockets, обробка потокових даних' },
      { name: 'JWT Auth / OAuth2 / Security', level: 90, desc: 'Безпечне хешування bcrypt, Refresh токени, RBAC контроль доступу' },
      { name: 'Redis (Caching & Queues)', level: 82, desc: 'Кешування запитів, черги повідомлень, Pub/Sub брокери' }
    ],
    'DevOps & Tooling': [
      { name: 'Git & GitHub Enterprise', level: 92, desc: 'Gitflow, інтерактивний ребейз, монорепозиторії, автоматизація PR' },
      { name: 'Docker & Docker Compose', level: 85, desc: 'Контейнеризація мікросервісів, multi-stage збірки, ізоляція середовищ' },
      { name: 'Vite / Webpack / Turbopack', level: 90, desc: 'Tree-shaking, code splitting, конфігурація збірки Next.js та Three.js' },
      { name: 'CI/CD Pipelines (GitHub Actions)', level: 85, desc: 'Автоматизоване тестування, лінтинг та деплой на хмарні сервери' }
    ]
  },

  projects: [
    {
      id: 'forma',
      portalKey: 'forma',
      title: 'Forma 3D',
      subtitle: 'Spatial Interior & Architecture Studio',
      badge: 'Spatial 3D Studio',
      themeColor: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.45)',
      url: 'https://github.com/Dmytrossss/Resume/tree/main/Forma-3D',
      githubUrl: 'https://github.com/Dmytrossss/Resume/tree/main/Forma-3D',
      description:
        'Комплексна інженерна веб-платформа для просторового 3D-моделювання та конфігурації приміщень у реальному часі. Включає систему динамічної нормалізації масштабів моделей, редагування матеріалів і текстур sub-mesh деталей, розрахунок площ і габаритів, збереження проектів у PostgreSQL та експорт у JSON/GLTF.',
      tags: ['React 19', 'Three.js', 'React Three Fiber', 'Zustand', 'FastAPI', 'PostgreSQL', 'TailwindCSS'],
      metrics: [
        '60+ FPS рендеринг складної геометрії з 120+ PBR-об\'єктами одночасно',
        'Повна синхронізація матеріалів, світлових пресетів Day/Night та IBL-карт',
        'Автономне збереження у LocalStorage та хмарну базу даних FastAPI'
      ],
      technologies: ['React 19', 'Three.js', 'React Three Fiber', 'Zustand', 'FastAPI', 'PostgreSQL', 'TailwindCSS']
    },
    {
      id: 'terrascope',
      portalKey: 'terrascope',
      title: 'TerraScope',
      subtitle: '3D Earth & Geospatial Telemetry Analytics',
      badge: '3D Earth Analytics',
      themeColor: '#34d399',
      accentGlow: 'rgba(52, 211, 153, 0.45)',
      url: 'https://github.com/Dmytrossss/Resume/tree/main/TerraScope',
      githubUrl: 'https://github.com/Dmytrossss/Resume/tree/main/TerraScope',
      description:
        'Геоінформаційна платформа для візуалізації глобальних метрик, супутникових даних та країнової аналітики в реальному часі. Реалізовано кастомні GLSL-шейдери атмосфери, обробку просторових координат (Lat/Lng to 3D Vector), шари теплових карт, траєкторії супутників та кластеризацію точок даних.',
      tags: ['React', 'Three.js', 'GLSL Shaders', 'FastAPI', 'GeoJSON', 'PostgreSQL/PostGIS', 'TailwindCSS'],
      metrics: [
        'Плавне обертання та зум глобуса без затримок пам\'яті',
        'Кастомні шейдери розсіювання атмосфери та рельєфних тіней',
        'Інтеграція REST API та фільтрація великих гео-масивів'
      ],
      technologies: ['React', 'Three.js', 'GLSL Shaders', 'FastAPI', 'GeoJSON', 'PostgreSQL/PostGIS', 'TailwindCSS']
    },
    {
      id: 'lumina',
      portalKey: 'lumina',
      title: 'Lumina',
      subtitle: 'Next-Gen Microlearning & Knowledge Platform',
      badge: 'Microlearning LMS',
      themeColor: '#c084fc',
      accentGlow: 'rgba(192, 132, 252, 0.45)',
      url: 'https://github.com/Dmytrossss/Resume/tree/main/Lumina',
      githubUrl: 'https://github.com/Dmytrossss/Resume/tree/main/Lumina',
      description:
        'Повнофункціональна система управління навчанням (LMS) нового покоління. Включає конструктор інтерактивних модулів, адаптивні тести з кривою забування Еббінгауза, систему винагород та ачівок, JWT-авторизацію з розподілом ролей (Студент / Викладач / Адмін) та дашборди аналітики.',
      tags: ['React', 'TypeScript', 'FastAPI', 'PostgreSQL', 'SQLAlchemy', 'Docker', 'TailwindCSS'],
      metrics: [
        'RESTful API з валідацією Pydantic та швидкістю відповіді < 40ms',
        'Повне покриття типізацією TypeScript та реляційна схема PostgreSQL',
        'Модульна компонентна архітектура з темною/світлою темою'
      ],
      technologies: ['React', 'TypeScript', 'FastAPI', 'PostgreSQL', 'SQLAlchemy', 'Docker', 'TailwindCSS']
    }
  ]
};
