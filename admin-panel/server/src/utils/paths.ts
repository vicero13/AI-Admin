import path from 'path';

const MAIN_APP_ROOT = process.env.MAIN_APP_ROOT || path.resolve(__dirname, '../../../../');

export const PATHS = {
  root: MAIN_APP_ROOT,
  config: path.join(MAIN_APP_ROOT, 'src', 'config', 'default.yaml'),
  knowledgeBase: path.join(MAIN_APP_ROOT, 'knowledge-base'),
  dialogs: path.join(MAIN_APP_ROOT, 'knowledge-base', 'dialogs'),
  dialogExamples: path.join(MAIN_APP_ROOT, 'knowledge-base', 'dialogs', 'examples.json'),
  faq: path.join(MAIN_APP_ROOT, 'knowledge-base', 'faq'),
  policies: path.join(MAIN_APP_ROOT, 'knowledge-base', 'policies'),
  backups: path.join(__dirname, '../../.backups'),
  mediaJson: path.join(MAIN_APP_ROOT, 'knowledge-base', 'media.json'),
  mediaFiles: path.join(MAIN_APP_ROOT, 'media'),
  mediaPresentations: path.join(MAIN_APP_ROOT, 'media', 'presentations'),
  mediaPhotos: path.join(MAIN_APP_ROOT, 'media', 'photos'),
  mediaVideos: path.join(MAIN_APP_ROOT, 'media', 'videos'),
};
