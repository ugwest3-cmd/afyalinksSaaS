const fs = require('fs');
const path = require('path');

// 1. Fix Pharmacy Type
const sharedTypesPath = 'g:\\AFYA LINKS\\packages\\shared\\src\\types\\index.ts';
let sharedTypes = fs.readFileSync(sharedTypesPath, 'utf8');
sharedTypes = sharedTypes.replace(
  /address: string \| null;/,
  "address: string | null;\n  whatsappConnected?: boolean;\n  pesapalConnected?: boolean;"
);
fs.writeFileSync(sharedTypesPath, sharedTypes);

// 2. Fix Button Props (asChild)
const buttonPath = 'g:\\AFYA LINKS\\apps\\web\\src\\components\\ui\\button.tsx';
let button = fs.readFileSync(buttonPath, 'utf8');
if (!button.includes('asChild?: boolean;')) {
  button = button.replace(
    /export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {/,
    "export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {\n  asChild?: boolean;"
  );
  fs.writeFileSync(buttonPath, button);
}

// 3. Fix Badge variant 'secondary' -> 'default' in pharmacies/[id]/page.tsx
const pIdPath = 'g:\\AFYA LINKS\\apps\\web\\src\\app\\admin\\pharmacies\\[id]\\page.tsx';
let pId = fs.readFileSync(pIdPath, 'utf8');
pId = pId.replace(/variant="secondary"/g, 'variant="default"');
// Fix Button variant 'link' -> 'ghost'
pId = pId.replace(/variant="link"/g, 'variant="ghost"');
fs.writeFileSync(pIdPath, pId);

// 4. Fix Badge variant 'secondary' -> 'default' in pharmacies/page.tsx
const pListPath = 'g:\\AFYA LINKS\\apps\\web\\src\\app\\admin\\pharmacies\\page.tsx';
let pList = fs.readFileSync(pListPath, 'utf8');
pList = pList.replace(/variant="secondary"/g, 'variant="default"');
fs.writeFileSync(pListPath, pList);

// 5. Fix Supabase middleware implicit any
const mwPath = 'g:\\AFYA LINKS\\apps\\web\\src\\lib\\supabase\\middleware.ts';
let mw = fs.readFileSync(mwPath, 'utf8');
mw = mw.replace(/cookiesToSet/g, 'cookiesToSet: any[]');
fs.writeFileSync(mwPath, mw);

// 6. Fix Supabase server implicit any
const srvPath = 'g:\\AFYA LINKS\\apps\\web\\src\\lib\\supabase\\server.ts';
let srv = fs.readFileSync(srvPath, 'utf8');
srv = srv.replace(/cookiesToSet/g, 'cookiesToSet: any[]');
fs.writeFileSync(srvPath, srv);
