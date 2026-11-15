import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {I18nProvider} from './i18n/I18nContext.tsx';
import './index.css';
import './academy.css';
import { AcademyProvider } from './context/AcademyContext';

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <AcademyProvider><App /></AcademyProvider>
  </I18nProvider>
);
