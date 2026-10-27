// Teste v2.2.0: categorii pentru „Prompturile mele” — câmp, listă de sugestii, filtru, export/import, import simplu cu `category`, compatibilitate cu date vechi.
import {launch, check, summary, hOverflow} from "./_lib.mjs";
import fs from "fs"; import os from "os"; import path from "path";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pv-cat-"));
const {browser, page, st} = await launch();
await page.evaluate(() => setLang('en')); await page.waitForTimeout(200);
// date vechi (fără `cat`) se încarcă fără erori și primesc categorie goală
await page.evaluate(() => { localStorage.setItem(TPLK, JSON.stringify([{id:'old1',name:'Vechi',vals:{},versions:[{n:1,ts:1,text:'text vechi',note:''}],tests:[]}])); tplLoad(); tplPersist(); });
check('șablon vechi fără categorie: cat = "" și contor 1', await page.evaluate(() => TPL.length === 1 && TPL[0].cat === '') && (await page.textContent('#tcnt')) === '1');
await page.click('#nt'); await page.waitForTimeout(150);
check('fără categorii: filtrul nu apare', await page.locator('#tp-catf').count() === 0);
// adăugare cu categorie
await page.click('#nadd'); await page.waitForTimeout(150);
await page.fill('#tp-name', 'Mail formal'); await page.fill('#tp-cat', '  muncă  '); await page.waitForTimeout(100);
check('categoria se normalizează și se salvează', await page.evaluate(() => TPL.at(-1).cat === 'muncă' && JSON.parse(localStorage.getItem(TPLK)).at(-1).cat === 'muncă'));
await page.click('#nadd'); await page.waitForTimeout(150);
await page.fill('#tp-name', 'Fragment cod'); await page.fill('#tp-cat', 'cod'); await page.waitForTimeout(100);
await page.click('#nadd'); await page.waitForTimeout(150);
await page.fill('#tp-name', 'Alt mail'); await page.fill('#tp-cat', 'muncă'); await page.waitForTimeout(100);
const opts = await page.evaluate(() => Array.from(document.querySelectorAll('#tp-catlist option')).map(o => o.value));
check('lista de sugestii conține categoriile existente, o singură dată', JSON.stringify(opts) === JSON.stringify(['cod', 'muncă']), opts);
await page.fill('#tp-cat', 'x'.repeat(80)); await page.waitForTimeout(80);
check('categoria e limitată la 40 de caractere', await page.evaluate(() => TPL.at(-1).cat.length === 40));
await page.fill('#tp-cat', 'muncă'); await page.waitForTimeout(80);
// filtru
await page.click('#nt'); await page.waitForTimeout(150);
check('filtrul apare cu 2 categorii + „All”', await page.locator('#tp-catf').count() === 1 && await page.locator('#tp-catf option').count() === 3);
check('implicit se văd toate cele 4 chip-uri', await page.locator('.tp-chip').count() === 4);
await page.selectOption('#tp-catf', 'muncă'); await page.waitForTimeout(150);
check('filtru „muncă”: 2 chip-uri', await page.locator('.tp-chip').count() === 2 && (await page.locator('.tp-chip').allTextContents()).every(x => /mail/i.test(x)), await page.locator('.tp-chip').allTextContents());
await page.click('[data-act=tplNew]'); await page.waitForTimeout(150);
check('șablon nou sub filtru moștenește categoria', await page.evaluate(() => TPL.at(-1).cat === 'muncă'));
await page.selectOption('#tp-catf', ''); await page.waitForTimeout(150);
check('filtru șters: toate cele 5 chip-uri', await page.locator('.tp-chip').count() === 5);
// export / import
const dl = page.waitForEvent('download'); await page.click('[data-act=tplExport]'); const dlf = await dl; const exp = path.join(tmp, 'e.json'); await dlf.saveAs(exp);
const J = JSON.parse(fs.readFileSync(exp, 'utf8'));
check('export păstrează categoriile', J.items.filter(x => x.cat === 'muncă').length === 3 && J.items.some(x => x.cat === 'cod'));
const simple = path.join(tmp, 's.json'); fs.writeFileSync(simple, JSON.stringify([{name: 'S1', text: 'a', category: 'școală'}, {name: 'S2', text: 'b', cat: ' școală '}, {name: 'S3', text: 'c'}]));
await page.setInputFiles('#tp-imp', simple); await page.waitForTimeout(250);
check('import simplu cu `category`/`cat`', await page.evaluate(() => TPL.filter(x => x.cat === 'școală').length === 2 && TPL.find(x => x.name === 'S3').cat === ''));
check('categoria nouă apare în filtru', await page.locator('#tp-catf option').count() === 4);
// ștergerea ultimului șablon dintr-o categorie curăță filtrul
await page.selectOption('#tp-catf', 'cod'); await page.waitForTimeout(150);
await page.locator('.tp-chip').first().click(); await page.waitForTimeout(100);
await page.click('[data-act=tplDel]'); await page.waitForTimeout(250); const d = page.locator('dialog.fff-dlg'); if (await d.count()) { await d.locator('button').last().click(); await page.waitForTimeout(250); }
check('după ștergerea ultimului din categorie, filtrul revine la „Toate” (7 șabloane rămase)', await page.evaluate(() => TS.catF === '') && await page.locator('.tp-chip').count() === 7 && await page.evaluate(() => TPL.length === 7));
check('persistă după reîncărcare', await (async () => { await page.reload(); await page.waitForTimeout(500); return page.evaluate(() => TPL.some(x => x.cat === 'școală') && TPL.some(x => x.cat === 'muncă')); })());
await page.evaluate(() => setLang('ro')); await page.click('#nt'); await page.waitForTimeout(200);
check('RO: etichete traduse', /Categorie/.test(await page.textContent('#gw')) && /Toate categoriile/.test(await page.textContent('#tp-catf')));
await page.setViewportSize({width: 360, height: 740}); await page.waitForTimeout(100);
check('360 px: fără depășire orizontală', (await hOverflow(page)) <= 0);
check('fără erori JS/CSP și 0 cereri de rețea', st.errs.length === 0 && st.net.length === 0, {e: st.errs, n: st.net});
await browser.close(); summary();
