// Teste v2.0.0: șabloane cu variabile, istoric de versiuni, diferențe, test A/B local, export/import. Rulează: node tests/templates.test.mjs
import {launch, check, summary, hOverflow, AXE} from "./_lib.mjs";
import fs from "fs";
const {browser, page, st} = await launch();
await page.addInitScript({content: AXE}); // scripturile init nu sunt supuse CSP
await page.reload(); await page.waitForTimeout(600);
await page.evaluate(() => setLang('en')); await page.waitForTimeout(200);

// funcții pure
const pure = await page.evaluate(() => ({
  vars: tplVars('Hi {{name}}, {{ role | x }} and {{name}} {{city|Paris}}').map(v => v.name + '=' + v.def),
  r1: tplRender('Hi {{name}} from {{city|Paris}}', {name: 'Ana'}),
  r2: tplRender('Hi {{name}}', {}),
  un: tplUnfilled('{{a}} {{b|x}} {{c}}', {c: 'z'}),
  d: tplDiff('a\nb\nc', 'a\nB\nc').map(r => r.o + r.x).join('|'),
  same: tplDiff('x', 'x').every(r => r.o === '=')
}));
check('tplVars: unice, cu valori implicite', JSON.stringify(pure.vars) === JSON.stringify(['name=', 'role=x', 'city=Paris']), pure.vars);
check('tplRender: valoare, implicit, marcaj rămas', pure.r1 === 'Hi Ana from Paris' && pure.r2 === 'Hi {{name}}', pure);
check('tplUnfilled numără doar variabilele fără valoare/implicit', pure.un === 1, pure.un);
check('tplDiff pe linii', pure.d === '=a|-b|+B|=c' && pure.same, pure.d);

// pornire: secțiunea apare, 0 șabloane
check('navigare: butonul „My templates” există', await page.locator('#nt').count() === 1);
check('contor șabloane 0', (await page.textContent('#tcnt')) === '0');
await page.click('#nt'); await page.waitForTimeout(150);
check('vedere goală afișată', /No templates yet/.test(await page.textContent('#gw')));
check('hash cat=tpl', (await page.evaluate(() => location.hash)) === '#cat=tpl');

// creare + editare
await page.click('[data-act=tplNew]'); await page.waitForTimeout(100);
check('șablon nou creat și contorizat', (await page.textContent('#tcnt')) === '1' && (await page.inputValue('#tp-text')).includes('{{task}}'));
check('variabile detectate (role, task)', await page.locator('.tp-var').count() === 2);
await page.fill('#tp-name', 'Mail rapid');
await page.fill('#tp-text', 'Write a {{tone|friendly}} email to {{who}} about {{topic}}.');
check('3 variabile după editare', await page.locator('.tp-var').count() === 3);
await page.locator('.tp-var[data-ph=who]').fill('Maria');
await page.locator('.tp-var[data-ph=topic]').fill('the meeting');
let prev = await page.textContent('#tp-prev');
check('previzualizare completată cu implicit și valori', prev === 'Write a friendly email to Maria about the meeting.', prev);
check('statistici afișate', /characters · \d+ words · ~\d+ tokens · 0 unfilled/.test(await page.textContent('#tp-stat')), await page.textContent('#tp-stat'));
check('indicator modificări nesalvate', /Unsaved/.test(await page.textContent('#tp-uns')));

// versiuni
await page.fill('#tp-note', 'prima mea');
await page.click('#tp-save'); await page.waitForTimeout(100);
let stg = await page.evaluate(() => JSON.parse(localStorage.getItem('promptvault.tpl')));
check('versiunea 2 salvată în localStorage cu notă', stg[0].versions.length === 2 && stg[0].versions[1].note === 'prima mea' && stg[0].name === 'Mail rapid' && stg[0].vals.who === 'Maria', stg[0]);
await page.click('#tp-save'); await page.waitForTimeout(80);
check('salvare fără modificări: nicio versiune nouă', (await page.evaluate(() => JSON.parse(localStorage.getItem('promptvault.tpl'))[0].versions.length)) === 2);
await page.fill('#tp-text', 'Write a SHORT {{tone|friendly}} email to {{who}} about {{topic}}.');
await page.click('#tp-save'); await page.waitForTimeout(80);
check('3 versiuni în istoric', await page.locator('#tp-hist .tp-ver').count() === 3);

// diff cu editorul
await page.fill('#tp-text', 'Write a SHORT {{tone|friendly}} email to {{who}}.');
await page.locator('[data-act=tplVDiff][data-n="1"]').click(); await page.waitForTimeout(80);
check('diferențe afișate față de versiunea 1', await page.locator('#tp-diff .dp').count() >= 1 && await page.locator('#tp-diff .dm').count() >= 1);

// restaurare
await page.locator('[data-act=tplRestore][data-n="1"]').click(); await page.waitForTimeout(100);
check('restaurare creează versiunea 4 cu textul v1 în editor', (await page.locator('#tp-hist .tp-ver').count()) === 4 && (await page.inputValue('#tp-text')).includes('{{task}}'));

// A/B
await page.selectOption('#tp-aa', '2'); await page.selectOption('#tp-ab', '3');
await page.click('[data-act=tplRun]'); await page.waitForTimeout(100);
check('A/B: două panouri și diferență', await page.locator('.tp-ab .pt').count() === 2 && await page.locator('#tp-abres .dp').count() >= 1);
check('A/B: ambele panouri folosesc aceleași valori', (await page.locator('.tp-ab .pt').allTextContents()).every(x => x.includes('Maria')));
await page.click('[data-act=tplWin][data-w=b]'); await page.waitForTimeout(80);
await page.click('[data-act=tplWin][data-w=t]'); await page.waitForTimeout(80);
stg = await page.evaluate(() => JSON.parse(localStorage.getItem('promptvault.tpl'))[0]);
check('A/B: două rezultate salvate', stg.tests.length === 2 && stg.tests[0].w === 'b' && stg.tests[0].a === 2 && stg.tests[0].b === 3, stg.tests);
check('A/B: clasamentul arată 1 victorie pentru v3', /Version 3: 1 win/.test(await page.textContent('#tp-tally')), await page.textContent('#tp-tally'));
await page.selectOption('#tp-ab', '2'); await page.click('[data-act=tplRun]');
check('A/B: aceeași versiune refuzată', /two different/.test(await page.textContent('#tp-abres')));

// ștergere versiune (dialog propriu, nu confirm nativ)
let native = false; page.on('dialog', d => { native = true; d.dismiss(); });
await page.locator('[data-act=tplVDel][data-n="4"]').click(); await page.waitForTimeout(250);
const dlg = page.locator('dialog.fff-dlg'); 
if (await dlg.count()) { await dlg.locator('button').last().click(); await page.waitForTimeout(200); }
check('ștergere versiune cu dialog propriu', !native && await page.locator('#tp-hist .tp-ver').count() === 3);

// export / import
const dl = page.waitForEvent('download'); await page.click('[data-act=tplExport]');
const file = await (await dl).path(); const J = JSON.parse(fs.readFileSync(file, 'utf8'));
check('export JSON cu format și un șablon', J.app === 'promptvault' && J.kind === 'templates' && J.items.length === 1);
await page.setInputFiles('#tp-imp', file); await page.waitForTimeout(250);
check('import adaugă o copie (2 șabloane)', (await page.textContent('#tcnt')) === '2' && await page.locator('.tp-chip').count() === 2);
fs.writeFileSync('/tmp/pv-bad.json', '{"x":1}');
await page.setInputFiles('#tp-imp', '/tmp/pv-bad.json'); await page.waitForTimeout(200);
check('import invalid refuzat', /not a valid/.test(await page.textContent('#pv-note')) && (await page.textContent('#tcnt')) === '2');

// persistență după reîncărcare
await page.reload(); await page.waitForTimeout(600);
check('șabloanele persistă după reload', (await page.textContent('#tcnt')) === '2');

// din bibliotecă
await page.click('#na'); await page.waitForTimeout(150);
await page.locator('.card').first().click(); await page.waitForTimeout(150);
await page.click('[data-act=tplFromMo]'); await page.waitForTimeout(250);
check('„Save as template” din bibliotecă: 3 șabloane, [X] → {{X}}', (await page.textContent('#tcnt')) === '3' && !/\[[A-Z ]+\]/.test(await page.inputValue('#tp-text')), await page.inputValue('#tp-text'));
check('modalul se închide, vedere șabloane', await page.locator('#mo.open').count() === 0 && (await page.textContent('#pt')).includes('My prompts'));

// ștergere șablon
await page.click('[data-act=tplDel]'); await page.waitForTimeout(250);
const d2 = page.locator('dialog.fff-dlg'); if (await d2.count()) { await d2.locator('button').last().click(); await page.waitForTimeout(200); }
check('ștergere șablon cu confirmare', (await page.textContent('#tcnt')) === '2');

// RO
await page.evaluate(() => setLang('ro')); await page.waitForTimeout(150);
check('interfață RO', /Prompturile mele/.test(await page.textContent('#nt')) && /Șablon nou/.test(await page.textContent('#gw')));
await page.evaluate(() => setLang('en'));

// a11y + layout
await page.click('.tp-chip'); await page.waitForTimeout(100);
const ax = await page.evaluate(async () => (await axe.run(document, {resultTypes: ['violations']})).violations.map(v => v.id + ':' + v.nodes.map(n => n.target).join('|').slice(0, 120)));
check('axe fără încălcări în vederea șabloanelor', ax.length === 0, ax);
await page.setViewportSize({width: 375, height: 700}); await page.waitForTimeout(150);
check('fără depășire orizontală pe mobil', (await hOverflow(page)) <= 0);
check('fără erori JS/CSP', st.errs.length === 0 && (await page.evaluate(() => window.__csp.length)) === 0, [st.errs, await page.evaluate(() => window.__csp)]);
check('0 cereri de rețea', st.net.length === 0, st.net);
await browser.close(); summary();
