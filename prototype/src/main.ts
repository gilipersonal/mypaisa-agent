import './styles/fonts.css';
import '@ds/tokens.css';
import '@ds/ios.css';
import '@ds/motion.css';
import './styles/boards/dc-atomics.css';
import './styles/boards/v4-root.css';
import './styles/boards/v4-web.css';
import './styles/boards/v4-phone.css';
import './styles/boards/v4-pages.css';
import './styles/boards/v4-chat.css';
import './styles/app.css';
import './areas';
import { mount } from 'svelte';
import App from './ui/App.svelte';

mount(App, { target: document.getElementById('app')! });
