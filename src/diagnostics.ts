/**
 * �򵥵���Ϲ��߽ű�
 * �����������̨ʹ��
 */

// ��ӵ�main.ts�����
declare const app: any;
declare const InitializationManager: any;

// �������
(window as any).diagnose = function() {
  console.log('App:', typeof app !== 'undefined' ? 'OK' : 'MISSING');
  console.log('Modules:', app?.modules ? Object.keys(app.modules).join(', ') : 'NONE');
  console.log('Errors:', InitializationManager?.getErrors?.().size || 0);
  
  if (app?.modules) {
    const states: Record<string, string> = {};
    Object.keys(app.modules).forEach((name: string) => {
      states[name] = InitializationManager?.getState?.(name) || 'unknown';
    });
    console.table(states);
  }
};

console.log('Diagnostic tools loaded. Run diagnose() in console.');
