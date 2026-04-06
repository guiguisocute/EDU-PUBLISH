import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const renderBootstrapError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  root.render(
    <React.StrictMode>
      <div className="min-h-screen w-full bg-slate-50 text-slate-900 p-6 md:p-10">
        <div className="max-w-3xl mx-auto rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <h1 className="text-xl font-black">页面加载失败</h1>
          <p className="text-sm text-slate-600">前端入口已捕获运行时错误，请打开开发者工具查看详细堆栈。</p>
          <div className="rounded-lg border bg-slate-50 p-3 text-xs font-mono break-all">{message}</div>
          <p className="text-xs text-slate-500">可尝试：强制刷新 (Ctrl+F5) 或使用 `pnpm dev -- --host --port 3002` 后访问新端口。</p>
        </div>
      </div>
    </React.StrictMode>
  );
};

Promise.all([
  import('./App'),
  import('@/components/ui/toaster')
])
  .then(([appModule, toasterModule]) => {
    const App = appModule.default;
    const { Toaster } = toasterModule;

    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
          <Toaster />
        </BrowserRouter>
      </React.StrictMode>
    );
  })
  .catch(renderBootstrapError);
