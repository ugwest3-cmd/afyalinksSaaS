const fs = require('fs');
const mwPath = 'g:\\AFYA LINKS\\apps\\web\\src\\lib\\supabase\\middleware.ts';
let mw = fs.readFileSync(mwPath, 'utf8');
mw = mw.replace(/setAll\(cookiesToSet\)/, 'setAll(cookiesToSet: any[])');
// Also fix the implicit any on the destructured args
mw = mw.replace(/\(\{ name, value, options \}\)/g, '({ name, value, options }: any)');
fs.writeFileSync(mwPath, mw);

const srvPath = 'g:\\AFYA LINKS\\apps\\web\\src\\lib\\supabase\\server.ts';
let srv = fs.readFileSync(srvPath, 'utf8');
srv = srv.replace(/setAll\(cookiesToSet\)/, 'setAll(cookiesToSet: any[])');
srv = srv.replace(/\(\{ name, value, options \}\)/g, '({ name, value, options }: any)');
fs.writeFileSync(srvPath, srv);
