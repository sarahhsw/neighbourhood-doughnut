import zipfile,sys,csv,os,re
import xml.etree.ElementTree as ET
ns={'table':'urn:oasis:names:tc:opendocument:xmlns:table:1.0','text':'urn:oasis:names:tc:opendocument:xmlns:text:1.0','office':'urn:oasis:names:tc:opendocument:xmlns:office:1.0'}
T='{%s}'%ns['table']; X='{%s}'%ns['text']; O='{%s}'%ns['office']
src,out=sys.argv[1],sys.argv[2]; os.makedirs(out,exist_ok=True)
z=zipfile.ZipFile(src); f=z.open('content.xml')
sheet=None; rows=[]
for ev,el in ET.iterparse(f,events=('start','end')):
    if ev=='start' and el.tag==T+'table': sheet=el.get(T+'name'); rows=[]
    elif ev=='end' and el.tag==T+'table-row':
        r=[]
        for c in el:
            if c.tag not in (T+'table-cell',T+'covered-table-cell'): continue
            n=int(c.get(T+'number-columns-repeated','1'))
            v=c.get(O+'value')
            if v is None: v=' '.join(''.join(p.itertext()) for p in c.findall(X+'p'))
            r.extend([v]*min(n,50))
        while r and r[-1] in ('',None): r.pop()
        rep=int(el.get(T+'number-rows-repeated','1'))
        if r: rows.extend([r]*min(rep,1))
        el.clear()
    elif ev=='end' and el.tag==T+'table':
        fn=re.sub(r'[^A-Za-z0-9_.-]','_',sheet)
        with open(os.path.join(out,fn+'.csv'),'w',newline='') as fh: csv.writer(fh).writerows(rows)
        print(sheet,len(rows)); el.clear()
