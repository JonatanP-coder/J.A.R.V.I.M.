const fs = require('node:fs');
const files = ['AccessibleDialog','LearnerProfileSelector','CodenameControl','SecureAccountPanel','SecureLeaderboard','AcademyPanel','MissionTools'].map(name=>'src/components/'+name+'.tsx');
files.push('src/context/AcademyContext.tsx','src/services/storage.ts','src/services/accessibility.ts','src/academy/curriculum.ts','src/academy/pedagogy.ts','src/academy/model.ts','src/components/ControlDock.tsx');
const found = new Set();
for(const file of files){
  const source = require('@babel/parser').parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['typescript','jsx']});
  function visit(node){
    if(node.type==='JSXText'){const value=node.value.trim();if(value)found.add(value);}
    if(node.type==='StringLiteral'){
      const value=node.value;
      if((/[áéíóúñ¿¡]/i.test(value)||/\b(de|el|la|tu|una|un|con|para|sin|por|del|los|que|en|no|solo|nivel|referencia|aprender|bronce|plata|oro|platino|diamante|guardar|glosario|sistema|sesión)\b/i.test(value))&&!/\.\.[/]|className|onClick|data-/.test(value))found.add(value);
    }
    for(const [key,value] of Object.entries(node)){if(['loc','start','end','extra','comments','tokens'].includes(key))continue;if(Array.isArray(value))value.forEach(child=>{if(child&&typeof child.type==='string')visit(child);});else if(value&&typeof value.type==='string')visit(value);}
  }visit(source);
}
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/i18n-strings.json',JSON.stringify([...found].sort(),null,2));
console.log([...found].sort().join('\n'));
