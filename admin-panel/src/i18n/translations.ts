export type LangCode = 'ru' | 'en' | 'de' | 'es' | 'fr' | 'zh' | 'hi';

export interface LangOption {
  code: LangCode;
  name: string;
  flag: string;
}

export const languages: LangOption[] = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

type TranslationKeys = {
  // Sidebar / Navigation
  'nav.dashboard': string;
  'nav.locations': string;
  'nav.offices': string;
  'nav.media': string;
  'nav.config': string;
  'nav.knowledge': string;
  'nav.dialogs': string;
  // Dashboard
  'dashboard.title': string;
  'dashboard.appStatus': string;
  'dashboard.online': string;
  'dashboard.offline': string;
  'dashboard.faqFiles': string;
  'dashboard.dialogFiles': string;
  'dashboard.policyFiles': string;
  'dashboard.quickActions': string;
  'dashboard.appDetails': string;
  'dashboard.language': string;
  // Quick actions
  'dashboard.configDesc': string;
  'dashboard.knowledgeDesc': string;
  'dashboard.dialogsDesc': string;
  // Common
  'common.save': string;
  'common.saving': string;
  'common.delete': string;
  'common.add': string;
  'common.cancel': string;
  'common.edit': string;
  'common.loading': string;
  'common.unsaved': string;
  'common.active': string;
  'common.archived': string;
  'common.showArchive': string;
  'common.confirm': string;
  'common.yes': string;
  'common.no': string;
  // Header
  'header.title': string;
  'header.subtitle': string;
};

const translations: Record<LangCode, TranslationKeys> = {
  ru: {
    'nav.dashboard': 'Dashboard',
    'nav.locations': 'Объекты',
    'nav.offices': 'Офисы',
    'nav.media': 'Медиа',
    'nav.config': 'Конфигурация',
    'nav.knowledge': 'База знаний',
    'nav.dialogs': 'Диалоги',
    'dashboard.title': 'Dashboard',
    'dashboard.appStatus': 'Статус приложения',
    'dashboard.online': 'Онлайн',
    'dashboard.offline': 'Оффлайн',
    'dashboard.faqFiles': 'FAQ файлы',
    'dashboard.dialogFiles': 'Файлы диалогов',
    'dashboard.policyFiles': 'Файлы политик',
    'dashboard.quickActions': 'Быстрые действия',
    'dashboard.appDetails': 'Детали приложения',
    'dashboard.language': 'Язык интерфейса',
    'dashboard.configDesc': 'Настройки AI, личности и системы',
    'dashboard.knowledgeDesc': 'Управление бизнес-информацией, услугами, FAQ',
    'dashboard.dialogsDesc': 'Импорт примеров диалогов в различных форматах',
    'common.save': 'Сохранить',
    'common.saving': 'Сохранение...',
    'common.delete': 'Удалить',
    'common.add': 'Добавить',
    'common.cancel': 'Отмена',
    'common.edit': 'Редактировать',
    'common.loading': 'Загрузка...',
    'common.unsaved': 'не сохранено',
    'common.active': 'Активен',
    'common.archived': 'В архиве',
    'common.showArchive': 'Показать архив',
    'common.confirm': 'Подтвердить',
    'common.yes': 'Да',
    'common.no': 'Нет',
    'header.title': 'AI-Admin Panel',
    'header.subtitle': 'Консоль управления',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.locations': 'Locations',
    'nav.offices': 'Offices',
    'nav.media': 'Media',
    'nav.config': 'Configuration',
    'nav.knowledge': 'Knowledge Base',
    'nav.dialogs': 'Dialogs',
    'dashboard.title': 'Dashboard',
    'dashboard.appStatus': 'App Status',
    'dashboard.online': 'Online',
    'dashboard.offline': 'Offline',
    'dashboard.faqFiles': 'FAQ Files',
    'dashboard.dialogFiles': 'Dialog Files',
    'dashboard.policyFiles': 'Policy Files',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.appDetails': 'App Details',
    'dashboard.language': 'Interface Language',
    'dashboard.configDesc': 'Edit AI, personality, and system settings',
    'dashboard.knowledgeDesc': 'Manage business info, services, FAQ',
    'dashboard.dialogsDesc': 'Import dialog examples in various formats',
    'common.save': 'Save',
    'common.saving': 'Saving...',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.loading': 'Loading...',
    'common.unsaved': 'unsaved',
    'common.active': 'Active',
    'common.archived': 'Archived',
    'common.showArchive': 'Show archive',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'header.title': 'AI-Admin Panel',
    'header.subtitle': 'Management Console',
  },
  de: {
    'nav.dashboard': 'Dashboard',
    'nav.locations': 'Standorte',
    'nav.offices': 'Büros',
    'nav.media': 'Medien',
    'nav.config': 'Konfiguration',
    'nav.knowledge': 'Wissensdatenbank',
    'nav.dialogs': 'Dialoge',
    'dashboard.title': 'Dashboard',
    'dashboard.appStatus': 'App-Status',
    'dashboard.online': 'Online',
    'dashboard.offline': 'Offline',
    'dashboard.faqFiles': 'FAQ-Dateien',
    'dashboard.dialogFiles': 'Dialogdateien',
    'dashboard.policyFiles': 'Richtliniendateien',
    'dashboard.quickActions': 'Schnellaktionen',
    'dashboard.appDetails': 'App-Details',
    'dashboard.language': 'Sprache der Oberfläche',
    'dashboard.configDesc': 'AI-, Persönlichkeits- und Systemeinstellungen bearbeiten',
    'dashboard.knowledgeDesc': 'Geschäftsinformationen, Dienste, FAQ verwalten',
    'dashboard.dialogsDesc': 'Dialogbeispiele in verschiedenen Formaten importieren',
    'common.save': 'Speichern',
    'common.saving': 'Speichere...',
    'common.delete': 'Löschen',
    'common.add': 'Hinzufügen',
    'common.cancel': 'Abbrechen',
    'common.edit': 'Bearbeiten',
    'common.loading': 'Laden...',
    'common.unsaved': 'nicht gespeichert',
    'common.active': 'Aktiv',
    'common.archived': 'Archiviert',
    'common.showArchive': 'Archiv anzeigen',
    'common.confirm': 'Bestätigen',
    'common.yes': 'Ja',
    'common.no': 'Nein',
    'header.title': 'AI-Admin Panel',
    'header.subtitle': 'Verwaltungskonsole',
  },
  es: {
    'nav.dashboard': 'Panel',
    'nav.locations': 'Ubicaciones',
    'nav.offices': 'Oficinas',
    'nav.media': 'Medios',
    'nav.config': 'Configuración',
    'nav.knowledge': 'Base de conocimiento',
    'nav.dialogs': 'Diálogos',
    'dashboard.title': 'Panel de control',
    'dashboard.appStatus': 'Estado de la app',
    'dashboard.online': 'En línea',
    'dashboard.offline': 'Desconectado',
    'dashboard.faqFiles': 'Archivos FAQ',
    'dashboard.dialogFiles': 'Archivos de diálogos',
    'dashboard.policyFiles': 'Archivos de políticas',
    'dashboard.quickActions': 'Acciones rápidas',
    'dashboard.appDetails': 'Detalles de la app',
    'dashboard.language': 'Idioma de la interfaz',
    'dashboard.configDesc': 'Editar configuración de AI, personalidad y sistema',
    'dashboard.knowledgeDesc': 'Gestionar información empresarial, servicios, FAQ',
    'dashboard.dialogsDesc': 'Importar ejemplos de diálogos en varios formatos',
    'common.save': 'Guardar',
    'common.saving': 'Guardando...',
    'common.delete': 'Eliminar',
    'common.add': 'Añadir',
    'common.cancel': 'Cancelar',
    'common.edit': 'Editar',
    'common.loading': 'Cargando...',
    'common.unsaved': 'sin guardar',
    'common.active': 'Activo',
    'common.archived': 'Archivado',
    'common.showArchive': 'Mostrar archivo',
    'common.confirm': 'Confirmar',
    'common.yes': 'Sí',
    'common.no': 'No',
    'header.title': 'AI-Admin Panel',
    'header.subtitle': 'Consola de gestión',
  },
  fr: {
    'nav.dashboard': 'Tableau de bord',
    'nav.locations': 'Emplacements',
    'nav.offices': 'Bureaux',
    'nav.media': 'Médias',
    'nav.config': 'Configuration',
    'nav.knowledge': 'Base de connaissances',
    'nav.dialogs': 'Dialogues',
    'dashboard.title': 'Tableau de bord',
    'dashboard.appStatus': "Statut de l'app",
    'dashboard.online': 'En ligne',
    'dashboard.offline': 'Hors ligne',
    'dashboard.faqFiles': 'Fichiers FAQ',
    'dashboard.dialogFiles': 'Fichiers de dialogues',
    'dashboard.policyFiles': 'Fichiers de politiques',
    'dashboard.quickActions': 'Actions rapides',
    'dashboard.appDetails': "Détails de l'app",
    'dashboard.language': "Langue de l'interface",
    'dashboard.configDesc': "Modifier les paramètres d'IA, de personnalité et du système",
    'dashboard.knowledgeDesc': "Gérer les informations d'entreprise, services, FAQ",
    'dashboard.dialogsDesc': 'Importer des exemples de dialogues dans divers formats',
    'common.save': 'Enregistrer',
    'common.saving': 'Enregistrement...',
    'common.delete': 'Supprimer',
    'common.add': 'Ajouter',
    'common.cancel': 'Annuler',
    'common.edit': 'Modifier',
    'common.loading': 'Chargement...',
    'common.unsaved': 'non enregistré',
    'common.active': 'Actif',
    'common.archived': 'Archivé',
    'common.showArchive': "Afficher l'archive",
    'common.confirm': 'Confirmer',
    'common.yes': 'Oui',
    'common.no': 'Non',
    'header.title': 'AI-Admin Panel',
    'header.subtitle': 'Console de gestion',
  },
  zh: {
    'nav.dashboard': '仪表板',
    'nav.locations': '地点',
    'nav.offices': '办公室',
    'nav.media': '媒体',
    'nav.config': '配置',
    'nav.knowledge': '知识库',
    'nav.dialogs': '对话',
    'dashboard.title': '仪表板',
    'dashboard.appStatus': '应用状态',
    'dashboard.online': '在线',
    'dashboard.offline': '离线',
    'dashboard.faqFiles': 'FAQ文件',
    'dashboard.dialogFiles': '对话文件',
    'dashboard.policyFiles': '政策文件',
    'dashboard.quickActions': '快速操作',
    'dashboard.appDetails': '应用详情',
    'dashboard.language': '界面语言',
    'dashboard.configDesc': '编辑AI、个性和系统设置',
    'dashboard.knowledgeDesc': '管理商业信息、服务、FAQ',
    'dashboard.dialogsDesc': '导入各种格式的对话示例',
    'common.save': '保存',
    'common.saving': '保存中...',
    'common.delete': '删除',
    'common.add': '添加',
    'common.cancel': '取消',
    'common.edit': '编辑',
    'common.loading': '加载中...',
    'common.unsaved': '未保存',
    'common.active': '活跃',
    'common.archived': '已归档',
    'common.showArchive': '显示存档',
    'common.confirm': '确认',
    'common.yes': '是',
    'common.no': '否',
    'header.title': 'AI管理面板',
    'header.subtitle': '管理控制台',
  },
  hi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.locations': 'स्थान',
    'nav.offices': 'कार्यालय',
    'nav.media': 'मीडिया',
    'nav.config': 'कॉन्फ़िगरेशन',
    'nav.knowledge': 'ज्ञान आधार',
    'nav.dialogs': 'संवाद',
    'dashboard.title': 'डैशबोर्ड',
    'dashboard.appStatus': 'ऐप स्थिति',
    'dashboard.online': 'ऑनलाइन',
    'dashboard.offline': 'ऑफ़लाइन',
    'dashboard.faqFiles': 'FAQ फ़ाइलें',
    'dashboard.dialogFiles': 'संवाद फ़ाइलें',
    'dashboard.policyFiles': 'नीति फ़ाइलें',
    'dashboard.quickActions': 'त्वरित क्रियाएँ',
    'dashboard.appDetails': 'ऐप विवरण',
    'dashboard.language': 'इंटरफ़ेस भाषा',
    'dashboard.configDesc': 'AI, व्यक्तित्व और सिस्टम सेटिंग्स संपादित करें',
    'dashboard.knowledgeDesc': 'व्यापार जानकारी, सेवाएँ, FAQ प्रबंधित करें',
    'dashboard.dialogsDesc': 'विभिन्न प्रारूपों में संवाद उदाहरण आयात करें',
    'common.save': 'सहेजें',
    'common.saving': 'सहेजा जा रहा है...',
    'common.delete': 'हटाएँ',
    'common.add': 'जोड़ें',
    'common.cancel': 'रद्द करें',
    'common.edit': 'संपादित करें',
    'common.loading': 'लोड हो रहा है...',
    'common.unsaved': 'सहेजा नहीं गया',
    'common.active': 'सक्रिय',
    'common.archived': 'संग्रहीत',
    'common.showArchive': 'संग्रह दिखाएँ',
    'common.confirm': 'पुष्टि करें',
    'common.yes': 'हाँ',
    'common.no': 'नहीं',
    'header.title': 'AI-एडमिन पैनल',
    'header.subtitle': 'प्रबंधन कंसोल',
  },
};

export default translations;
export type TranslationKey = keyof TranslationKeys;
