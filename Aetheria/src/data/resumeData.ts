import { DeveloperProfile, Locale, Translations } from '../types/portfolio';

export const developerProfiles: Record<Locale, DeveloperProfile> = {
  uk: {
    name: "Гнилицький Дмитро",
    role: "Full-Stack & 3D Creative Developer",
    location: "Київ, Україна",
    bio: "Full-Stack розробник із глибокою пристрастю до сучасного 3D-вебу, WebGL, Three.js та високопродуктивних React/Next.js додатків. Створюю інтерактивні 3D-світи, конфігуратори меблів, складні платформи та інтуїтивні користувацькі інтерфейси.",
    summary: [
      "3+ роки комерційного та продуктового досвіду у веб-розробці.",
      "Спеціалізація: React, Next.js 15, TypeScript, Three.js, React Three Fiber, WebGL, TailwindCSS, Node.js, Python/FastAPI.",
      "Досвід розробки реальних 3D-конфігураторів (Forma-3D), геопросторових платформ (TerraScope) та LMS-систем (Lumina)."
    ],
    skills: [
      {
        category: "3D & WebGL",
        items: ["Three.js", "React Three Fiber", "Drei", "Rapier 3D Physics", "GLSL Shaders", "Blender", "Mixamo Animations", "FBX / GLTF Pipelines"]
      },
      {
        category: "Frontend Core",
        items: ["React 19", "Next.js 15 (App Router)", "TypeScript", "JavaScript (ESNext)", "TailwindCSS", "Zustand", "Framer Motion", "HTML5 / CSS3"]
      },
      {
        category: "Backend & Tools",
        items: ["Node.js", "Express", "Python", "FastAPI", "PostgreSQL", "Prisma / SQLAlchemy", "Git & GitHub", "Vite", "Docker"]
      }
    ],
    contacts: {
      email: "dmitriy.hnylitskiy@gmail.com",
      telegram: "https://t.me/dmytrossss",
      github: "https://github.com/Dmytrossss",
      linkedin: "https://linkedin.com/in/dmytro-hnylitskiy"
    },
    projects: {
      forma: {
        id: "forma",
        title: "Forma-3D (3D Furniture Store & Configurator)",
        tagline: "Інтерактивний 3D-конфігуратор меблів та редактор кімнат",
        description: "Повноцінний 3D інтернет-магазин та редактор інтер'єру з підтримкою зміни текстур, матеріалів, розмірів, модульного розміщення об'єктів та фізичного простору.",
        tags: ["Three.js", "React Three Fiber", "Next.js 15", "TypeScript", "TailwindCSS", "Zustand"],
        url: "http://localhost:3001",
        githubUrl: "https://github.com/Dmytrossss",
        color: "#ffffff",
        features: [
          "Модульний 3D редактор кімнат та розташування об'єктів на сітці",
          "Динамічна зміна кольорів, дерева, шкіри та металу",
          "Експорт 3D сцени у формат JSON"
        ]
      },
      terrascope: {
        id: "terrascope",
        title: "TerraScope (3D Earth & Analytics)",
        tagline: "Інтерактивна 3D геопросторова платформа візуалізації",
        description: "Аналітична 3D платформа глобальних супутникових та просторових даних із кастомними шейдерами атмосфери Землі та маркерами активності.",
        tags: ["Three.js", "WebGL Shaders", "React", "FastAPI", "GIS Data"],
        url: "http://localhost:3002",
        githubUrl: "https://github.com/Dmytrossss",
        color: "#ffffff",
        features: [
          "Фотореалістична 3D Земля з процедурною атмосферою",
          "Інтерактивна навігація орбітальною камерою",
          "Візуалізація просторових гео-даних"
        ]
      },
      lumina: {
        id: "lumina",
        title: "Lumina (MiniLMS Learning Platform)",
        tagline: "Сучасна освітня платформа та система управління навчанням",
        description: "Платформа дистанційної освіти з інтерактивними курсами, тестуванням, аналітикою прогресу студентів та модульними уроками.",
        tags: ["Next.js 15", "TypeScript", "PostgreSQL", "Prisma", "TailwindCSS"],
        url: "http://localhost:3003",
        githubUrl: "https://github.com/Dmytrossss",
        color: "#ffffff",
        features: [
          "Модульна структура курсів та уроків",
          "Система відстеження прогресу та оцінювання",
          "Адаптивний та швидкий інтерфейс"
        ]
      }
    }
  },
  en: {
    name: "Dmytro Hnylitskiy",
    role: "Full-Stack & 3D Creative Developer",
    location: "Kyiv, Ukraine",
    bio: "Full-Stack developer with a strong focus on the modern 3D web, WebGL, Three.js, and high-performance React/Next.js applications. Creating interactive 3D worlds, furniture configurators, data-intensive platforms, and intuitive interfaces.",
    summary: [
      "3+ years of commercial and product engineering experience in web development.",
      "Core stack: React, Next.js 15, TypeScript, Three.js, React Three Fiber, WebGL, TailwindCSS, Node.js, Python/FastAPI.",
      "Proven track record building interactive 3D configurators (Forma-3D), geospatial engines (TerraScope), and LMS platforms (Lumina)."
    ],
    skills: [
      {
        category: "3D & WebGL",
        items: ["Three.js", "React Three Fiber", "Drei", "Rapier 3D Physics", "GLSL Shaders", "Blender", "Mixamo Animations", "FBX / GLTF Pipelines"]
      },
      {
        category: "Frontend Core",
        items: ["React 19", "Next.js 15 (App Router)", "TypeScript", "JavaScript (ESNext)", "TailwindCSS", "Zustand", "Framer Motion", "HTML5 / CSS3"]
      },
      {
        category: "Backend & Tools",
        items: ["Node.js", "Express", "Python", "FastAPI", "PostgreSQL", "Prisma / SQLAlchemy", "Git & GitHub", "Vite", "Docker"]
      }
    ],
    contacts: {
      email: "dmitriy.hnylitskiy@gmail.com",
      telegram: "https://t.me/dmytrossss",
      github: "https://github.com/Dmytrossss",
      linkedin: "https://linkedin.com/in/dmytro-hnylitskiy"
    },
    projects: {
      forma: {
        id: "forma",
        title: "Forma-3D (3D Furniture Store & Configurator)",
        tagline: "Interactive 3D furniture configurator & room planner",
        description: "Full-featured 3D e-commerce store and interior planner with dynamic texture swapping, materials, custom dimensions, grid placement, and spatial physics.",
        tags: ["Three.js", "React Three Fiber", "Next.js 15", "TypeScript", "TailwindCSS", "Zustand"],
        url: "http://localhost:3001",
        githubUrl: "https://github.com/Dmytrossss",
        color: "#ffffff",
        features: [
          "Modular 3D room planner with grid object positioning",
          "Real-time material, color, wood, leather, and metal swapping",
          "JSON export & state persistence"
        ]
      },
      terrascope: {
        id: "terrascope",
        title: "TerraScope (3D Earth & Analytics)",
        tagline: "Interactive 3D geospatial visualization platform",
        description: "Global satellite analytics platform with custom atmospheric GLSL shaders, orbital camera navigation, and real-time spatial marker rendering.",
        tags: ["Three.js", "WebGL Shaders", "React", "FastAPI", "GIS Data"],
        url: "http://localhost:3002",
        githubUrl: "https://github.com/Dmytrossss",
        color: "#ffffff",
        features: [
          "Photorealistic 3D Earth globe with procedural atmosphere",
          "Smooth orbital camera navigation & zoom",
          "Geospatial data layer visualization"
        ]
      },
      lumina: {
        id: "lumina",
        title: "Lumina (MiniLMS Learning Platform)",
        tagline: "Modern e-learning and student management platform",
        description: "Comprehensive distance learning platform featuring interactive course authoring, automated testing, student analytics, and modular curricula.",
        tags: ["Next.js 15", "TypeScript", "PostgreSQL", "Prisma", "TailwindCSS"],
        url: "http://localhost:3003",
        githubUrl: "https://github.com/Dmytrossss",
        color: "#ffffff",
        features: [
          "Modular course and lesson management",
          "Automated grading and analytics progress tracker",
          "Responsive, ultra-fast interface"
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
      modeClassicDesc: "Швидкий та зручний формат звичного лендінгу з детальним описом досвіду, технологічного стеку та проєктів.",
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
      availableForWork: "Відкритий до нових пропозицій",
      contactMe: "Зв'язатися",
      viewIn3D: "Відкрити в 3D",
      aboutTitle: "Про мене",
      aboutSubtitle: "Досвід, підхід до розробки та ключові компетенції",
      skillsTitle: "Стек & Навички",
      skillsSubtitle: "Технології та інструменти, з якими я працюю щодня",
      projectsTitle: "Вибрані Проєкти",
      projectsSubtitle: "Реальні комерційні та інженерні рішення",
      keyFeatures: "Ключові можливості:",
      liveDemo: "Переглянути проєкт",
      sourceCode: "Вихідний код",
      contactsTitle: "Контакти",
      contactsSubtitle: "Готовий до обговорення нових викликів та співпраці",
      copyEmail: "Скопіювати Email",
      copied: "Скопійовано!",
      openLink: "Відкрити",
      rightsReserved: "Усі права захищено."
    },
    modals: {
      close: "Закрити",
      biography: "Біографія та досвід",
      skillsAndTech: "Стек та технології",
      contactsAndSocial: "Контакти та соціальні мережі",
      visitSite: "Відвідати сайт"
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
      subtitle: "Interactive 3D Portfolio & Resume of Dmytro Hnylitskiy",
      chooseMode: "Choose your preferred viewing experience:",
      mode3DTitle: "Interactive 3D World",
      mode3DDesc: "Explore the 3D island, control your character, and interact with project portals and skill altars.",
      mode3DBtn: "Enter 3D World",
      modeClassicTitle: "Classic Resume",
      modeClassicDesc: "Fast and structured web landing page with complete overview of experience, tech stack, and projects.",
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
      availableForWork: "Available for new opportunities",
      contactMe: "Get in Touch",
      viewIn3D: "Explore in 3D",
      aboutTitle: "About Me",
      aboutSubtitle: "Background, engineering philosophy, and core focus",
      skillsTitle: "Tech Stack & Skills",
      skillsSubtitle: "Technologies and tools I use on a daily basis",
      projectsTitle: "Featured Projects",
      projectsSubtitle: "Real-world commercial and engineering applications",
      keyFeatures: "Key Highlights:",
      liveDemo: "View Project",
      sourceCode: "Source Code",
      contactsTitle: "Contact & Links",
      contactsSubtitle: "Always open to exciting projects and engineering collaborations",
      copyEmail: "Copy Email",
      copied: "Copied!",
      openLink: "Open Link",
      rightsReserved: "All rights reserved."
    },
    modals: {
      close: "Close",
      biography: "Biography & Background",
      skillsAndTech: "Skills & Technologies",
      contactsAndSocial: "Contacts & Social Links",
      visitSite: "Visit Website"
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
