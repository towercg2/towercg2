import * as React from 'react';
import App from './App';
import './reset.css';
import './index.css';
import registerServiceWorker from './registerServiceWorker';

// build issues with @types/react-dom means this is the easiest solution.
const ReactDOM = require("react-dom");

ReactDOM.render(
  <App />,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();
