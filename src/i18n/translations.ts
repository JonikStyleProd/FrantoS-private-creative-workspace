import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ru' | 'en';

export interface Translations {
  // Navigation & Primary Spaces
  nav: {
    overview: string;
    catalog: string;
    workspace: string;
    moodboard: string;
    atmosphere: string;
    atelier2026: string;
  };
  // Header & Controls
  header: {
    spaces: string;
    create: string;
    search: string;
    settings: string;
    menu: string;
    currentSpace: string;
    searchPlaceholder: string;
    searchAria: string;
    themeLightAria: string;
    themeDarkAria: string;
    themeLabel: string;
    publishBtn: string;
    publishArtifact: string;
    publishArtifactDesc: string;
    publishStory: string;
    publishStoryDesc: string;
    language: string;
    languageAria: string;
    accountMenuAria: string;
  };
  // Account / Profile Menu
  accountMenu: {
    signedInAs: string;
    roleDefault: string;
    switchPersona: string;
    editProfile: string;
    savedArtifacts: string;
    studioDispatch: string;
    cloudSync: string;
    languageSetting: string;
    themeSetting: string;
    lightTheme: string;
    darkTheme: string;
    disconnect: string;
    closeMenu: string;
  };
  // Overview Space
  overview: {
    centerpieceBadge: string;
    continueWorking: string;
    viewInCatalog: string;
    orbitNav: string;
    orbitCompass: string;
    orbitHint: string;
    recentMoments: string;
    broadcastsCount: string;
    postMoment: string;
    postMomentSubtitle: string;
    activeSprints: string;
    studioKanban: string;
    newProject: string;
    sprintCompletion: string;
    recentlyInspected: string;
    clearRecent: string;
    selectOrbitObject: string;
  };
  // Catalog Space
  catalog: {
    mastheadBadge: string;
    titleAll: string;
    titleDiscipline: string;
    subtitle: string;
    allDisciplines: string;
    resetFilters: string;
    emptyTitle: string;
    publishFirst: string;
    filterAll: string;
    filterFinished: string;
    filterWip: string;
    filterSaved: string;
    filterMine: string;
    sortRecent: string;
    sortLikes: string;
    sortSaves: string;
    sortViews: string;
    viewGrid: string;
    viewDense: string;
    countLabel: string;
    likes: string;
    saves: string;
    wipBadge: string;
    finishedBadge: string;
  };
  // Workspace (Sprints) Space
  workspace: {
    badge: string;
    title: string;
    subtitle: string;
    addTask: string;
    modalTitle: string;
    taskTitlePlaceholder: string;
    taskDescPlaceholder: string;
    priorityHigh: string;
    priorityMedium: string;
    priorityLow: string;
    stageConcept: string;
    stageFormFinding: string;
    stageProduction: string;
    stagePolishing: string;
    stageDelivery: string;
    advanceStage: string;
    regressStage: string;
    deleteTask: string;
    tasksCount: string;
    assignee: string;
    dueDate: string;
    cancel: string;
    createTask: string;
    noTasks: string;
  };
  // Moodboard Space
  moodboard: {
    badge: string;
    title: string;
    subtitle: string;
    addNote: string;
    addImage: string;
    addPalette: string;
    gridToggle: string;
    inspector: string;
    noSelection: string;
    itemTitle: string;
    itemContent: string;
    rotation: string;
    bringForward: string;
    sendBackward: string;
    deleteItem: string;
    mobileSheetTitle: string;
    mobileSheetClose: string;
    scaleHint: string;
  };
  // Atmosphere / Weather Space
  atmosphere: {
    badge: string;
    title: string;
    subtitle: string;
    muteTone: string;
    synthesizeTone: string;
    ambientMode: string;
    flowPotential: string;
    flowFriction: string;
    creativePressure: string;
    creativeZone: string;
    opticalSpectrum: string;
    acousticProfile: string;
    synthActive: string;
    synthIdle: string;
    presets: {
      chronoFlow: string;
      chronoDesc: string;
      causticSolitude: string;
      causticDesc: string;
      specularVelocity: string;
      specularDesc: string;
      organicStillness: string;
      organicDesc: string;
    };
  };
  // Modals
  modals: {
    newExhibitTitle: string;
    editExhibitTitle: string;
    stepMedia: string;
    stepParams: string;
    stepConfirm: string;
    coverVisualLabel: string;
    coverPresetLabel: string;
    stateLabel: string;
    stateDraft: string;
    stateDraftDesc: string;
    stateWip: string;
    stateWipDesc: string;
    stateFinished: string;
    stateFinishedDesc: string;
    sprintProgress: string;
    projectTitle: string;
    projectSubtitle: string;
    disciplineLabel: string;
    descriptionLabel: string;
    tagsLabel: string;
    toolsLabel: string;
    passportTitle: string;
    publishBtn: string;
    saveChangesBtn: string;
    saveDraftBtn: string;
    cancelBtn: string;
    nextParamsBtn: string;
    nextConfirmBtn: string;
    backBtn: string;
    livePreviewBadge: string;
    // Detail Modal
    thesisHeading: string;
    materialsHeading: string;
    discussionHeading: string;
    discussionEmpty: string;
    commentPlaceholder: string;
    commentSendBtn: string;
    specsHeading: string;
    colorPaletteLabel: string;
    typographyLabel: string;
    toolsUsedLabel: string;
    framerateLabel: string;
    polygonsLabel: string;
    pinToBoardBtn: string;
    sendToSprintBtn: string;
    pinnedToast: string;
    sprintCreatedToast: string;
    copiedToast: string;
    editPostBtn: string;
    deletePostBtn: string;
    // Story Modal
    newStoryTitle: string;
    storySnapshotLabel: string;
    storyArchetypeLabel: string;
    storyTitleLabel: string;
    storyNotesLabel: string;
    storyPublishBtn: string;
    // Search Modal
    searchPlaceholder: string;
    searchTabAll: string;
    searchTabProjects: string;
    searchTabDisciplines: string;
    searchTabAuthors: string;
    searchNoResults: string;
    // Auth Modal
    authTitle: string;
    authSubtitle: string;
    authNotice: string;
    authSwitchPersona: string;
    authCloudBtn: string;
    authLocalBtn: string;
  };
  // Mobile Bottom Bar
  mobileNav: {
    overview: string;
    catalog: string;
    createAria: string;
    sprints: string;
    canvas: string;
    atmosphere: string;
    more: string;
    moreSpaces: string;
    sheetTitle: string;
    sheetClose: string;
    publishProject: string;
    publishProjectDesc: string;
    broadcastMoment: string;
    broadcastMomentDesc: string;
    openAtmosphere: string;
    openAtmosphereDesc: string;
  };
  // Branded Footer (JonikStyle Production)
  footer: {
    designedBy: string;
    copyright: (year: number) => string;
    tagline: string;
    disciplinesCount: string;
    shadersSpec: string;
    studioStatus: string;
  };
  // Common
  common: {
    loading: string;
    save: string;
    saved: string;
    justNow: string;
    readMore: string;
    close: string;
    back: string;
    year: string;
    errorRequiredTitle: string;
    errorRequiredMedia: string;
  };
}

export const translations: Record<Language, Translations> = {
  ru: {
    nav: {
      overview: 'Обзор',
      catalog: 'Каталог',
      workspace: 'Спринты',
      moodboard: 'Холст',
      atmosphere: 'Атмосфера',
      atelier2026: 'ATELIER 2026',
    },
    header: {
      spaces: 'Пространство',
      create: 'Создать',
      search: 'Поиск',
      settings: 'Настройки',
      menu: 'Меню',
      currentSpace: 'Пространство',
      searchPlaceholder: 'Поиск по архиву (Cmd + K)',
      searchAria: 'Поиск по архиву и материалам студии',
      themeLightAria: 'Переключить на светлую тему',
      themeDarkAria: 'Переключить на тёмную тему',
      themeLabel: 'Тема оформления',
      publishBtn: 'Опубликовать',
      publishArtifact: 'Опубликовать проект',
      publishArtifactDesc: 'Создать кейс, 3D модель или WIP исследование',
      publishStory: 'Момент процесса',
      publishStoryDesc: 'Транслировать эскиз, шейдер или заметку',
      language: 'Язык',
      languageAria: 'Сменить язык интерфейса',
      accountMenuAria: 'Открыть меню профиля',
    },
    accountMenu: {
      signedInAs: 'Вход выполнен',
      roleDefault: 'Арт-директор и пространственный дизайнер',
      switchPersona: 'Сменить демо-персону',
      editProfile: 'Редактировать профиль',
      savedArtifacts: 'Сохранённые работы',
      studioDispatch: 'Студийный канал',
      cloudSync: 'Синхронизация с облаком',
      languageSetting: 'Язык / Language',
      themeSetting: 'Тема оформления',
      lightTheme: 'Светлая тема',
      darkTheme: 'Тёмная тема',
      disconnect: 'Сбросить сессию',
      closeMenu: 'Закрыть меню',
    },
    overview: {
      centerpieceBadge: 'ЦЕНТРАЛЬНЫЙ АРТ-ОБЪЕКТ // СТУДИЯ 2026',
      continueWorking: 'Продолжить работу',
      viewInCatalog: 'Открыть в каталоге',
      orbitNav: 'Спутниковая навигация по проектам',
      orbitCompass: 'Орбитальный 3D-компас',
      orbitHint: 'Вращайте или выберите объект на орбите для смены экспозиции',
      recentMoments: 'Моменты процесса и эскизы',
      broadcastsCount: 'записей',
      postMoment: 'Добавить момент',
      postMomentSubtitle: 'Эскиз или заметка',
      activeSprints: 'АКТИВНЫЕ СПРИНТЫ // В ПРОИЗВОДСТВЕ',
      studioKanban: 'Стол задач',
      newProject: 'Новый проект',
      sprintCompletion: 'Готовность спринта',
      recentlyInspected: 'Недавно открытые:',
      clearRecent: 'Очистить историю',
      selectOrbitObject: 'Выбрать проект на орбите',
    },
    catalog: {
      mastheadBadge: 'КАТАЛОГ СТУДИИ // ИЗДАНИЕ 2026',
      titleAll: 'Архив проектов и экспонатов',
      titleDiscipline: '— Избранное',
      subtitle: 'Экспозиция кейсов, пространственных исследований и генеративных концепций мастерской.',
      allDisciplines: 'Все дисциплины',
      resetFilters: 'Сбросить фильтры',
      emptyTitle: 'В каталоге не найдено проектов, соответствующих выбранным критериям.',
      publishFirst: 'Сдать первый проект',
      filterAll: 'Все работы',
      filterFinished: 'Завершенные кейсы',
      filterWip: 'В производстве',
      filterSaved: 'Архив / Избранное',
      filterMine: 'Мои проекты',
      sortRecent: 'Недавние',
      sortLikes: 'По симпатиям',
      sortSaves: 'По сохранениям',
      sortViews: 'По просмотрам',
      viewGrid: 'Сетка',
      viewDense: 'Компактно',
      countLabel: 'Экспонатов:',
      likes: 'Одобрений',
      saves: 'В закладках',
      wipBadge: 'В работе',
      finishedBadge: 'Кейс готов',
    },
    workspace: {
      badge: 'СТОЛ АРТ-ДИРЕКТОРА // СПРИНТЫ ПРОИЗВОДСТВА',
      title: 'Производственные спринты и пайплайн',
      subtitle: 'Канбан-доска стадий создания цифровых артефактов, пространственных моделей и генеративных сред.',
      addTask: 'Новая задача',
      modalTitle: 'Новая задача в спринт',
      taskTitlePlaceholder: 'Например: Тестирование каустики стеклянного монолита...',
      taskDescPlaceholder: 'Описание задачи, критерии сдачи и технические параметры...',
      priorityHigh: 'Высокий приоритет',
      priorityMedium: 'Средний приоритет',
      priorityLow: 'Низкий приоритет',
      stageConcept: 'Концепция',
      stageFormFinding: 'Поиск формы',
      stageProduction: 'Производство',
      stagePolishing: 'Полировка',
      stageDelivery: 'Сдача',
      advanceStage: 'Переместить на следующую стадию',
      regressStage: 'Вернуть на предыдущую стадию',
      deleteTask: 'Удалить задачу',
      tasksCount: 'задач',
      assignee: 'Исполнитель',
      dueDate: 'Срок',
      cancel: 'Отмена',
      createTask: 'Создать задачу',
      noTasks: 'Нет задач на этой стадии',
    },
    moodboard: {
      badge: 'ПРОСТРАНСТВЕННЫЙ МУДБОРД // ХОЛСТ АТЕЛЬЕ',
      title: 'Свободный рабочий холст материалов',
      subtitle: 'Перетаскивайте, масштабируйте и комбинируйте снимки, палитры и пространственные заметки.',
      addNote: 'Добавить заметку',
      addImage: 'Загрузить образ',
      addPalette: 'Палитра цветов',
      gridToggle: 'Сетка студии',
      inspector: 'Инспектор свойств',
      noSelection: 'Выберите элемент на холсте для редактирования свойств.',
      itemTitle: 'Заголовок объекта',
      itemContent: 'Содержимое / Текст',
      rotation: 'Угол поворота',
      bringForward: 'На передний план',
      sendBackward: 'На задний план',
      deleteItem: 'Удалить с холста',
      mobileSheetTitle: 'Свойства выбранного объекта',
      mobileSheetClose: 'Готово',
      scaleHint: 'Масштабирование и перемещение активны',
    },
    atmosphere: {
      badge: 'АТМОСФЕРА СТУДИИ // АКУСТИЧЕСКОЕ ПОЛЕ',
      title: 'Акустическое поле и биометрия фокуса',
      subtitle: 'Генеративный звуковой ландшафт, частотные настройки для глубокой концентрации и оптические индексы творческой среды.',
      muteTone: 'Остановить тон',
      synthesizeTone: 'Синтезировать',
      ambientMode: 'Режим среды:',
      flowPotential: 'Потенциал фокуса',
      flowFriction: 'Когнитивное сопротивление: 0.04 (Оптимально)',
      creativePressure: 'Творческое давление',
      creativeZone: 'Зона плотной генерации идей',
      opticalSpectrum: 'Оптический спектр',
      acousticProfile: 'Акустический профиль',
      synthActive: 'ГАРМОНИКА АКТИВНА',
      synthIdle: 'НАЖМИТЕ ДЛЯ СТАРТА',
      presets: {
        chronoFlow: 'Хроно-поток',
        chronoDesc: 'Пиковая концентрация',
        causticSolitude: 'Глубокая каустика',
        causticDesc: 'Тета-поток подсознания',
        specularVelocity: 'Неоновый импульс',
        specularDesc: 'Быстрое прототипирование',
        organicStillness: 'Органический покой',
        organicDesc: 'Мягкий творческий дрейф',
      },
    },
    modals: {
      newExhibitTitle: 'Монтажный стол публикации',
      editExhibitTitle: 'Редактирование проекта',
      stepMedia: '1. Медиа-материал',
      stepParams: '2. Параметры и статус',
      stepConfirm: '3. Предпросмотр и сдача',
      coverVisualLabel: 'Визуальный материал обложки *',
      coverPresetLabel: 'Или выбрать из студийных материалов',
      stateLabel: 'Статус в пайплайне студии',
      stateDraft: 'Черновик',
      stateDraftDesc: 'Скрыт',
      stateWip: 'В работе',
      stateWipDesc: 'Активный спринт',
      stateFinished: 'Завершён',
      stateFinishedDesc: 'В каталог',
      sprintProgress: 'Прогресс спринта',
      projectTitle: 'Название проекта *',
      projectSubtitle: 'Подзаголовок / Тезис',
      disciplineLabel: 'Творческая дисциплина',
      descriptionLabel: 'Концепция и описание',
      tagsLabel: 'Теги (через запятую)',
      toolsLabel: 'Инструменты',
      passportTitle: 'Паспорт публикации',
      publishBtn: 'Опубликовать в каталог студии',
      saveChangesBtn: 'Сохранить изменения',
      saveDraftBtn: 'Сохранить как черновик',
      cancelBtn: 'Отмена',
      nextParamsBtn: 'Далее: Параметры и статус',
      nextConfirmBtn: 'Перейти к сдаче',
      backBtn: 'Назад',
      livePreviewBadge: 'Живой предпросмотр в каталоге',
      // Detail
      thesisHeading: 'Концепция и пространственный тезис',
      materialsHeading: 'Материалы и процесс производства',
      discussionHeading: 'Обсуждение в студии',
      discussionEmpty: 'Комментариев пока нет. Начните обсуждение первым.',
      commentPlaceholder: 'Оставить заметку, правку или отзыв арт-директора...',
      commentSendBtn: 'Отправить',
      specsHeading: 'Паспорт спецификаций',
      colorPaletteLabel: 'Спектральная палитра',
      typographyLabel: 'Типографика',
      toolsUsedLabel: 'Стек инструментов',
      framerateLabel: 'Частота кадров:',
      polygonsLabel: 'Плотность полигонов:',
      pinToBoardBtn: 'На мудборд',
      sendToSprintBtn: 'В спринт',
      pinnedToast: 'Закреплено на мудборде',
      sprintCreatedToast: 'Спринт создан',
      copiedToast: 'Скопировано',
      editPostBtn: 'Изменить',
      deletePostBtn: 'Удалить',
      // Story
      newStoryTitle: 'Публикация момента процесса',
      storySnapshotLabel: 'Визуальный снимок / Эскиз *',
      storyArchetypeLabel: 'Тип момента',
      storyTitleLabel: 'Заголовок момента *',
      storyNotesLabel: 'Заметки и параметры',
      storyPublishBtn: 'Опубликовать момент',
      // Search
      searchPlaceholder: 'Поиск по архиву студии...',
      searchTabAll: 'Всё',
      searchTabProjects: 'Проекты',
      searchTabDisciplines: 'Дисциплины',
      searchTabAuthors: 'Авторы',
      searchNoResults: 'По вашему запросу ничего не найдено',
      // Auth
      authTitle: 'Облачный доступ FrantoS',
      authSubtitle: 'Подключение к Supabase и облачному хранилищу',
      authNotice: 'В режиме демонстрации данные сохраняются локально в вашем браузере.',
      authSwitchPersona: 'Сменить демо-персону:',
      authCloudBtn: 'Подключить учётную запись',
      authLocalBtn: 'Продолжить локально',
    },
    mobileNav: {
      overview: 'Обзор',
      catalog: 'Каталог',
      createAria: 'Создать новый проект или момент',
      sprints: 'Спринты',
      canvas: 'Холст',
      atmosphere: 'Атмосфера',
      more: 'Ещё',
      moreSpaces: 'Дополнительные пространства',
      sheetTitle: '// ПУБЛИКАЦИЯ В АТЕЛЬЕ',
      sheetClose: 'Закрыть панель действий',
      publishProject: 'Опубликовать проект в каталог',
      publishProjectDesc: 'Монтажный стол кейса, 3D модели или WIP исследования',
      broadcastMoment: 'Транслировать момент процесса',
      broadcastMomentDesc: 'Эскиз, снимок шейдера или заметка в рабочий журнал',
      openAtmosphere: 'Атмосфера и акустическое поле',
      openAtmosphereDesc: 'Бинауральный тон 528 Гц и биометрия творческого фокуса',
    },
    footer: {
      designedBy: 'Дизайн и разработка — JonikStyle Production',
      copyright: (year: number) => `© ${year} JonikStyle Production. Все права защищены.`,
      tagline: 'Цифровое ателье, живой 3D-архив и приватное пространство арт-директора.',
      disciplinesCount: 'ДИСЦИПЛИНЫ: 06',
      shadersSpec: 'ШЕЙДЕРЫ: GLSL 3.0',
      studioStatus: 'АТЕЛЬЕ: АКТИВНО',
    },
    common: {
      loading: 'Загрузка...',
      save: 'Сохранить',
      saved: 'Сохранено',
      justNow: 'Только что',
      readMore: 'Подробнее',
      close: 'Закрыть',
      back: 'Назад',
      year: 'год',
      errorRequiredTitle: 'Укажите название проекта',
      errorRequiredMedia: 'Выберите или загрузите визуальный материал',
    },
  },
  en: {
    nav: {
      overview: 'Overview',
      catalog: 'Catalog',
      workspace: 'Sprints',
      moodboard: 'Canvas',
      atmosphere: 'Atmosphere',
      atelier2026: 'ATELIER 2026',
    },
    header: {
      spaces: 'Spaces',
      create: 'Create',
      search: 'Search',
      settings: 'Settings',
      menu: 'Menu',
      currentSpace: 'Space',
      searchPlaceholder: 'Search archive (Cmd + K)',
      searchAria: 'Search archive and studio materials',
      themeLightAria: 'Switch to light theme',
      themeDarkAria: 'Switch to dark theme',
      themeLabel: 'Interface theme',
      publishBtn: 'Publish',
      publishArtifact: 'Publish Project',
      publishArtifactDesc: 'Create project case study, 3D model, or WIP post',
      publishStory: 'Process Moment',
      publishStoryDesc: 'Broadcast sketch, shader capture, or studio note',
      language: 'Language',
      languageAria: 'Switch interface language',
      accountMenuAria: 'Open creator account menu',
    },
    accountMenu: {
      signedInAs: 'Signed in as',
      roleDefault: 'Creative Director & Spatial Designer',
      switchPersona: 'Switch Demo Persona',
      editProfile: 'Edit Profile',
      savedArtifacts: 'Saved Works Vault',
      studioDispatch: 'Studio Dispatch Channel',
      cloudSync: 'Cloud Synchronization',
      languageSetting: 'Language / Язык',
      themeSetting: 'Interface Theme',
      lightTheme: 'Light Theme',
      darkTheme: 'Dark Theme',
      disconnect: 'Reset Vault Session',
      closeMenu: 'Close menu',
    },
    overview: {
      centerpieceBadge: 'FEATURED MASTERPIECE // STUDIO 2026',
      continueWorking: 'Continue Working',
      viewInCatalog: 'View in Catalog',
      orbitNav: 'Project Satellite Filmstrip',
      orbitCompass: '3D Orbit Compass',
      orbitHint: 'Rotate compass or select satellite node to switch hero centerpiece',
      recentMoments: 'Process Moments & Sketches',
      broadcastsCount: 'moments',
      postMoment: 'Post Moment',
      postMomentSubtitle: 'Sketch or note',
      activeSprints: 'ACTIVE SPRINTS // IN PRODUCTION',
      studioKanban: 'Studio Kanban',
      newProject: 'New Project',
      sprintCompletion: 'Sprint Completion',
      recentlyInspected: 'Recently Inspected:',
      clearRecent: 'Clear History',
      selectOrbitObject: 'Select orbit project',
    },
    catalog: {
      mastheadBadge: 'STUDIO CATALOG // 2026 EDITION',
      titleAll: 'Projects & Exhibits Archive',
      titleDiscipline: '— Curated',
      subtitle: 'Exhibition of case studies, spatial explorations, and generative studio concepts.',
      allDisciplines: 'All Disciplines',
      resetFilters: 'Reset Filters',
      emptyTitle: 'No exhibits matched your filter criteria.',
      publishFirst: 'Publish First Project',
      filterAll: 'All Works',
      filterFinished: 'Finished Cases',
      filterWip: 'In Production',
      filterSaved: 'Saved / Vault',
      filterMine: 'My Projects',
      sortRecent: 'Recent',
      sortLikes: 'Most Liked',
      sortSaves: 'Most Saved',
      sortViews: 'Most Viewed',
      viewGrid: 'Grid',
      viewDense: 'Dense',
      countLabel: 'Exhibits:',
      likes: 'Likes',
      saves: 'Saved',
      wipBadge: 'In Progress',
      finishedBadge: 'Case Finished',
    },
    workspace: {
      badge: 'ART DIRECTOR DESK // PRODUCTION SPRINTS',
      title: 'Production Sprints & Studio Pipeline',
      subtitle: 'Kanban stages for crafting digital artifacts, spatial models, and generative environments.',
      addTask: 'New Task',
      modalTitle: 'New Sprint Task',
      taskTitlePlaceholder: 'e.g. Caustic refraction tests on silica crystal...',
      taskDescPlaceholder: 'Task description, delivery criteria, and technical parameters...',
      priorityHigh: 'High Priority',
      priorityMedium: 'Medium Priority',
      priorityLow: 'Low Priority',
      stageConcept: 'Concept',
      stageFormFinding: 'Form Finding',
      stageProduction: 'Production',
      stagePolishing: 'Polishing',
      stageDelivery: 'Delivery',
      advanceStage: 'Advance to next stage',
      regressStage: 'Return to previous stage',
      deleteTask: 'Delete task',
      tasksCount: 'tasks',
      assignee: 'Assignee',
      dueDate: 'Due Date',
      cancel: 'Cancel',
      createTask: 'Create Task',
      noTasks: 'No tasks in this stage',
    },
    moodboard: {
      badge: 'SPATIAL MOODBOARD // ATELIER CANVAS',
      title: 'Infinite Studio Material Canvas',
      subtitle: 'Drag, scale, and compose visual captures, color palettes, and spatial notes.',
      addNote: 'Add Note',
      addImage: 'Upload Visual',
      addPalette: 'Color Palette',
      gridToggle: 'Studio Grid',
      inspector: 'Object Inspector',
      noSelection: 'Select an item on the canvas to inspect and edit properties.',
      itemTitle: 'Item Title',
      itemContent: 'Content / Text Note',
      rotation: 'Rotation Angle',
      bringForward: 'Bring Forward',
      sendBackward: 'Send Backward',
      deleteItem: 'Delete Item',
      mobileSheetTitle: 'Selected Object Properties',
      mobileSheetClose: 'Done',
      scaleHint: 'Canvas panning and scaling active',
    },
    atmosphere: {
      badge: 'STUDIO ATMOSPHERE // ACOUSTIC FIELD',
      title: 'Acoustic Field & Flow Biometrics',
      subtitle: 'Generative soundscapes, deep focus carrier frequencies, and optical studio ambient indices.',
      muteTone: 'Mute Tone',
      synthesizeTone: 'Synthesize',
      ambientMode: 'Atmospheric Mode:',
      flowPotential: 'Flow Potential',
      flowFriction: 'Cognitive Friction: 0.04 (Optimal)',
      creativePressure: 'Creative Pressure',
      creativeZone: 'High Density Ideation Zone',
      opticalSpectrum: 'Optical Spectrum',
      acousticProfile: 'Acoustic Profile',
      synthActive: 'SYNTHESIS ONLINE',
      synthIdle: 'CLICK TO SYNTHESIZE',
      presets: {
        chronoFlow: 'Chrono-Flow',
        chronoDesc: 'Peak Focus Flow',
        causticSolitude: 'Deep Caustic',
        causticDesc: 'Theta Subconscious Stream',
        specularVelocity: 'Specular Impulse',
        specularDesc: 'Rapid Prototyping',
        organicStillness: 'Organic Stillness',
        organicDesc: 'Gentle Creative Drift',
      },
    },
    modals: {
      newExhibitTitle: 'Publishing Staging Desk',
      editExhibitTitle: 'Edit Creative Project',
      stepMedia: '1. Media Asset',
      stepParams: '2. Parameters & Status',
      stepConfirm: '3. Preview & Delivery',
      coverVisualLabel: 'Cover Artwork Visual *',
      coverPresetLabel: 'Or select from studio assets',
      stateLabel: 'Studio Pipeline State',
      stateDraft: 'Studio Draft',
      stateDraftDesc: 'Exploratory & Hidden',
      stateWip: 'Active WIP',
      stateWipDesc: 'In Production Sprint',
      stateFinished: 'Finished Exhibit',
      stateFinishedDesc: 'Complete Case Study',
      sprintProgress: 'Sprint Progress',
      projectTitle: 'Project Title *',
      projectSubtitle: 'Subtitle / Thesis',
      disciplineLabel: 'Creative Discipline',
      descriptionLabel: 'Concept & Description',
      tagsLabel: 'Tags (comma separated)',
      toolsLabel: 'Software & Tools',
      passportTitle: 'Publication Passport',
      publishBtn: 'Publish to Studio Catalog',
      saveChangesBtn: 'Save Changes',
      saveDraftBtn: 'Save as Draft',
      cancelBtn: 'Cancel',
      nextParamsBtn: 'Next: Parameters & Status',
      nextConfirmBtn: 'Next: Delivery Preview',
      backBtn: 'Back',
      livePreviewBadge: 'Live Catalog Preview',
      // Detail
      thesisHeading: 'Concept & Spatial Thesis',
      materialsHeading: 'Materials & Production Pipeline',
      discussionHeading: 'Studio Discussion',
      discussionEmpty: 'No studio comments yet. Be the first to start the thread.',
      commentPlaceholder: 'Contribute spatial feedback, shader specs, or notes...',
      commentSendBtn: 'Post',
      specsHeading: 'Technical Specifications',
      colorPaletteLabel: 'Spectral Palette',
      typographyLabel: 'Typography Architecture',
      toolsUsedLabel: 'Engine Stack',
      framerateLabel: 'Target Framerate:',
      polygonsLabel: 'Mesh Density:',
      pinToBoardBtn: 'Pin to Moodboard',
      sendToSprintBtn: 'Send to Sprint',
      pinnedToast: 'Pinned to Moodboard',
      sprintCreatedToast: 'Sprint task created',
      copiedToast: 'Copied',
      editPostBtn: 'Edit',
      deletePostBtn: 'Delete',
      // Story
      newStoryTitle: 'Broadcast Process Moment',
      storySnapshotLabel: 'Process Visual / Snapshot *',
      storyArchetypeLabel: 'Moment Archetype',
      storyTitleLabel: 'Moment Title *',
      storyNotesLabel: 'Notes & Parameters',
      storyPublishBtn: 'Broadcast Moment',
      // Search
      searchPlaceholder: 'Search studio archive...',
      searchTabAll: 'All',
      searchTabProjects: 'Projects',
      searchTabDisciplines: 'Disciplines',
      searchTabAuthors: 'Creators',
      searchNoResults: 'No artifacts match your query',
      // Auth
      authTitle: 'FrantoS Cloud Sync',
      authSubtitle: 'Connect to Supabase & Cloud Storage',
      authNotice: 'In Demo Mode, all artifacts are stored securely in your browser local vault.',
      authSwitchPersona: 'Switch Demo Persona:',
      authCloudBtn: 'Connect Cloud Account',
      authLocalBtn: 'Continue with Local Vault',
    },
    mobileNav: {
      overview: 'Overview',
      catalog: 'Catalog',
      createAria: 'Create new project or moment',
      sprints: 'Sprints',
      canvas: 'Canvas',
      atmosphere: 'Atmosphere',
      more: 'More',
      moreSpaces: 'Additional Spaces',
      sheetTitle: '// ATELIER PUBLISHING',
      sheetClose: 'Close actions panel',
      publishProject: 'Publish Project to Catalog',
      publishProjectDesc: 'Staging desk for case study, 3D model, or WIP post',
      broadcastMoment: 'Broadcast Process Moment',
      broadcastMomentDesc: 'Ephemeral sketch, shader capture, or studio note',
      openAtmosphere: 'Atmosphere & Acoustic Field',
      openAtmosphereDesc: 'Binaural 528Hz drone and focus biometrics',
    },
    footer: {
      designedBy: 'Designed & developed by JonikStyle Production',
      copyright: (year: number) => `© ${year} JonikStyle Production. All rights reserved.`,
      tagline: 'Private creative workspace, living 3D archive, and digital atelier for art directors.',
      disciplinesCount: 'DISCIPLINES: 06',
      shadersSpec: 'SHADERS: GLSL 3.0',
      studioStatus: 'ATELIER: ACTIVE',
    },
    common: {
      loading: 'Loading...',
      save: 'Save',
      saved: 'Saved',
      justNow: 'Just now',
      readMore: 'Read more',
      close: 'Close',
      back: 'Back',
      year: 'year',
      errorRequiredTitle: 'Project title is required',
      errorRequiredMedia: 'Please select or upload a visual asset',
    },
  },
};
