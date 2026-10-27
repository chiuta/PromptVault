// Teste v2.1.0: „Prompturile mele” — adăugare, editare, ștergere, export/import JSON (format propriu și format simplu). Rulează: node tests/own-prompts.test.mjs
import {launch, check, summary, hOverflow} from "./_lib.mjs";
import fs from "fs"; import os from "os"; import path from "path";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pv-own-"));
const {browser, page, st} = await launch();
await page.evaluate(() => setLang('en')); await page.waitForTimeout(200);
const confirmDlg = async () => { await page.waitForTimeout(250); const d = page.locator('dialog.fff-dlg'); if (await d.count()) { await d.locator('button').last().click(); await page.waitForTimeout(200); } };
const note = () => page.textContent('#pv-note');

check('butonul „Add your own prompt” există și e vizibil în bara laterală', await page.locator('#nadd').isVisible() && /Add your own prompt/.test(await page.textContent('#nadd')));
check('intrarea din navigare se numește „My prompts & templates”', /My prompts & templates/.test(await page.textContent('#nt')));
// adăugare
await page.click('#nadd'); await page.waitForTimeout(150);
check('adăugare: se deschide editorul și contorul e 1', (await page.textContent('#tcnt')) === '1' && await page.locator('#tp-text').count() === 1);
await page.fill('#tp-name', 'Salut scurt'); await page.fill('#tp-text', 'Scrie un salut scurt, fără variabile.');
await page.click('#tp-save'); await page.waitForTimeout(150);
check('prompt fără variabile: se salvează ca versiunea 1+', await page.evaluate(() => TPL.length === 1 && TPL[0].name === 'Salut scurt' && TPL[0].versions.length >= 1 && TPL[0].versions.at(-1).text === 'Scrie un salut scurt, fără variabile.'));
// editare
await page.fill('#tp-text', 'Scrie un salut scurt și prietenos pentru {{nume|colegi}}.'); await page.click('#tp-save'); await page.waitForTimeout(150);
const v = await page.evaluate(() => TPL[0].versions.map(x => x.text));
check('editare: versiune nouă, istoric păstrat', v.length >= 2 && /prietenos/.test(v.at(-1)) && /fără variabile/.test(v[v.length - 2]), v);
await page.reload(); await page.waitForTimeout(500); await page.evaluate(() => setLang('en')); 
check('persistă după reîncărcare (localStorage)', (await page.textContent('#tcnt')) === '1');
// export
await page.click('#nt'); await page.waitForTimeout(150);
const dl = page.waitForEvent('download'); await page.click('[data-act=tplExport]'); const dlf = await dl;
const exp = path.join(tmp, "export.json"); await dlf.saveAs(exp);
const J = JSON.parse(fs.readFileSync(exp, "utf8"));
check('export: format promptvault/templates cu prompturile', J.app === 'promptvault' && J.kind === 'templates' && J.items.length === 1 && J.items[0].name === 'Salut scurt');
// ștergere
await page.locator('.tp-chip').first().click(); await page.waitForTimeout(100);
await page.click('[data-act=tplDel]'); await confirmDlg();
check('ștergere cu confirmare: contor 0', (await page.textContent('#tcnt')) === '0');
// import format propriu
await page.setInputFiles('#tp-imp', exp); await page.waitForTimeout(250);
check('import format propriu: prompt revenit', (await page.textContent('#tcnt')) === '1' && /Imported 1/.test(await note()), await note());
// import format simplu
const simple = path.join(tmp, "simplu.json");
fs.writeFileSync(simple, JSON.stringify([{name: "Rezumat", text: "Rezumă textul în 3 puncte."}, {title: "Traducere", prompt: "Traduce în engleză: {{text}}"}, {text: "Prompt fără nume dat"}, {nimic: true}, {text: "   "}]));
await page.setInputFiles('#tp-imp', simple); await page.waitForTimeout(250);
const names = await page.evaluate(() => TPL.map(x => x.name));
check('import format simplu: 3 prompturi valide (name/title/text/prompt), 2 ignorate', names.length === 4 && names.includes('Rezumat') && names.includes('Traducere') && names.includes('Prompt fără nume dat'), names);
await page.setInputFiles('#tp-imp', simple); await page.waitForTimeout(250);
check('reimport al aceluiași fișier simplu nu dublează', (await page.evaluate(() => TPL.length)) === 4 && /Imported 0/.test(await note()), await note());
const objForm = path.join(tmp, "obiect.json"); fs.writeFileSync(objForm, JSON.stringify({prompts: [{name: "Din obiect", text: "Text din obiect"}]}));
await page.setInputFiles('#tp-imp', objForm); await page.waitForTimeout(250);
check('import {"prompts":[…]}', (await page.evaluate(() => TPL.length)) === 5);
// invalid
const bad = path.join(tmp, "rau.json"); fs.writeFileSync(bad, "{nu e json");
await page.setInputFiles('#tp-imp', bad); await page.waitForTimeout(250);
check('JSON invalid refuzat, nimic pierdut', /not a valid/.test(await note()) && (await page.evaluate(() => TPL.length)) === 5);
const bad2 = path.join(tmp, "gol.json"); fs.writeFileSync(bad2, JSON.stringify([{x: 1}]));
await page.setInputFiles('#tp-imp', bad2); await page.waitForTimeout(250);
check('listă fără prompturi valide refuzată', /not a valid/.test(await note()) && (await page.evaluate(() => TPL.length)) === 5);
// ștergere dintr-un import
await page.locator('.tp-chip', {hasText: 'Rezumat'}).click(); await page.waitForTimeout(100);
await page.click('[data-act=tplDel]'); await confirmDlg();
check('ștergerea unui prompt importat', (await page.evaluate(() => TPL.length)) === 4 && !(await page.evaluate(() => TPL.some(x => x.name === 'Rezumat'))));
// RO
await page.evaluate(() => setLang('ro')); await page.waitForTimeout(150);
check('interfață RO: „Prompturile mele” și „Adaugă propriul prompt”', /Prompturile mele/.test(await page.textContent('#nt')) && /Adaugă propriul prompt/.test(await page.textContent('#nadd')));
await page.evaluate(() => setLang('en'));
// rețea, erori, mobil
check('0 cereri de rețea', st.net.length === 0, st.net);
check('fără erori de pagină', st.errs.length === 0, st.errs);
const csp = await page.evaluate(() => window.__csp); check('fără încălcări CSP', csp.length === 0, csp);
await page.setViewportSize({width: 360, height: 740}); await page.waitForTimeout(150);
check('360 px: fără depășire orizontală', (await hOverflow(page)) <= 0);
await browser.close(); summary();
