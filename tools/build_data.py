#!/usr/bin/env python3
"""Build JSON data files for the 学习站 site from open sources.

Sources:
- complete-hsk-vocabulary (MIT): HSK 3.0 word lists (syllabus 11/2025, "newest")
- CVDICT (CC BY-SA 4.0, Phong Phan): Vietnamese meanings
- Make Me a Hanzi (LGPL / Arphic PL): decomposition, radicals, etymology
- hanzi-writer-data (Arphic PL): stroke data
- Hán Việt readings, radical names, Vietnamese hints and topics: written for this project
"""
import json, os, re, shutil, sys, unicodedata
from collections import defaultdict

B = os.path.dirname(os.path.abspath(__file__))           # thư mục tools/
SRC = os.environ.get('XXZ_SRC', os.path.join(B, 'sources'))  # nơi clone các kho dữ liệu gốc
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(B, '..', 'data')
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(OUT, 'strokes'), exist_ok=True)

def nfc(s):
    return unicodedata.normalize('NFC', s)

# ---------- Hán Việt ----------
def modern_y(s):
    # kì→kỳ, lí→lý, mĩ→mỹ, hi→hy, ti→ty, tỉ→tỷ (modern common spelling)
    m = re.fullmatch(r'([klmht])([iíìỉĩị])', s)
    if not m:
        return s
    tone = {'i': 'y', 'í': 'ý', 'ì': 'ỳ', 'ỉ': 'ỷ', 'ĩ': 'ỹ', 'ị': 'ỵ'}[m.group(2)]
    return m.group(1) + tone

HV = {}
for fn in ('hv14.txt', 'hv56.txt', 'hv_comp.txt'):
    for item in open(os.path.join(B, fn), encoding='utf8').read().strip().split('|'):
        c, r = item.strip().split(' ', 1)
        rs = [modern_y(nfc(x.strip())) for x in r.split('/') if x.strip() and x.strip() != '?']
        if rs:
            HV[c] = rs
# readings missing from the classical dictionaries (modern characters)
HV.update({'啤': ['ti'], '咱': ['cha'], '嗯': ['ân']})

# word-level overrides for polyphonic characters
HV_WORD = {
    '音乐': 'âm nhạc', '快乐': 'khoái lạc', '乐': 'lạc', '银行': 'ngân hàng', '行李': 'hành lý',
    '自行车': 'tự hành xa', '旅行': 'lữ hành', '行': 'hành', '流行': 'lưu hành', '举行': 'cử hành', '进行': 'tiến hành',
    '长': 'trường', '校长': 'hiệu trưởng', '院长': 'viện trưởng', '队长': 'đội trưởng', '家长': 'gia trưởng',
    '增长': 'tăng trưởng', '重要': 'trọng yếu', '重': 'trọng', '重视': 'trọng thị', '重点': 'trọng điểm',
    '好': 'hảo', '爱好': 'ái hiếu', '兴趣': 'hứng thú', '高兴': 'cao hứng', '感兴趣': 'cảm hứng thú',
    '处': 'xứ', '好处': 'hảo xứ', '坏处': 'hoại xứ', '到处': 'đáo xứ', '处理': 'xử lý',
    '为了': 'vị liễu', '为': 'vị', '因为': 'nhân vị', '认为': 'nhận vi', '以为': 'dĩ vi', '作为': 'tác vi', '成为': 'thành vi',
    '应该': 'ưng cai', '应': 'ưng', '影响': 'ảnh hưởng', '应聘': 'ứng sính', '适应': 'thích ứng', '答应': 'đáp ứng',
    '着': 'trước', '着急': 'trước cấp', '着火': 'trước hỏa', '有着': 'hữu trước', '接着': 'tiếp trước',
    '干': 'can', '干净': 'can tịnh', '干杯': 'can bôi', '干活儿': 'cán hoạt nhi',
    '便宜': 'tiện nghi', '方便': 'phương tiện', '随便': 'tùy tiện', '不便': 'bất tiện', '便于': 'tiện vu',
    '容易': 'dung dị', '易': 'dị', '弹': 'đàn',
    '推': 'thôi', '推出': 'thôi xuất', '推迟': 'thôi trì',
}

def word_hv(w):
    if w in HV_WORD:
        return HV_WORD[w]
    parts = []
    for ch in w:
        if ch == '儿' and len(w) > 1 and w.endswith('儿') and ch is w[-1]:
            parts.append('nhi')
            continue
        parts.append(HV.get(ch, ['?'])[0])
    return ' '.join(parts)

# ---------- Radicals ----------
RAD = []
RAD_BY = {}
for line in open(os.path.join(B, 'radicals.txt'), encoding='utf8'):
    line = line.strip()
    if not line:
        continue
    no, r, var, name, mean = line.split('|')
    entry = {'no': int(no), 'r': r, 'v': [x for x in var.split(',') if x], 'name': name, 'mean': mean}
    RAD.append(entry)
    RAD_BY[r] = entry
    for v in entry['v']:
        RAD_BY.setdefault(v, entry)
# common simplified radical forms
for simp, base in {'讠': '言', '钅': '金', '饣': '食', '纟': '糸', '贝': '貝', '见': '見', '车': '車', '门': '門',
                   '马': '馬', '鸟': '鳥', '鱼': '魚', '页': '頁', '风': '風', '飞': '飛', '长': '長', '韦': '韋',
                   '齿': '齒', '龙': '龍', '麦': '麥', '黄': '黃', '齐': '齊', '龟': '龜', '卤': '鹵', '黾': '黽'}.items():
    RAD_BY.setdefault(simp, RAD_BY[base])
VARIANT_NAMES = {
    '亻': 'Nhân đứng', '氵': 'Ba chấm thủy', '扌': 'Tài gảy (thủ)', '忄': 'Tâm đứng', '讠': 'Ngôn',
    '艹': 'Thảo đầu', '辶': 'Sước', '纟': 'Mịch', '钅': 'Kim', '饣': 'Thực', '犭': 'Khuyển', '礻': 'Thị',
    '衤': 'Y', '灬': 'Hỏa (bốn chấm)', '刂': 'Đao đứng', '⺮': 'Trúc đầu', '王': 'Ngọc', '⺼': 'Nhục (nguyệt)',
    '冫': 'Băng (hai chấm)', '罒': 'Võng', '耂': 'Lão', '攵': 'Phộc', '⻊': 'Túc', '牜': 'Ngưu', '爫': 'Trảo',
    '丬': 'Tường', '⺌': 'Tiểu', '⺍': 'Tiểu', '彐': 'Kệ', '⺈': 'Đao', '覀': 'Á',
}

def radical_info(c):
    e = RAD_BY.get(c)
    if not e:
        return None
    name = VARIANT_NAMES.get(c, e['name'])
    if c == '阝':
        name = 'Phụ / Ấp'
        mean = 'gò đất (bên trái) · vùng đất (bên phải)'
    else:
        mean = e['mean']
    return {'no': e['no'], 'base': e['r'], 'name': name, 'mean': mean}

# ---------- CVDICT ----------
CV = defaultdict(list)
line_re = re.compile(r'^(\S+) (\S+) \[([^\]]*)\] /(.*)/\s*$')
for line in open(os.path.join(SRC, 'CVDICT', 'CVDICT.u8'), encoding='utf8'):
    if line.startswith('#'):
        continue
    m = line_re.match(line)
    if not m:
        continue
    trad, simp, py, gl = m.groups()
    CV[simp].append((py.lower().replace('u:', 'v').replace(' ', ''), [g.strip() for g in gl.split('/') if g.strip()], py[:1].isupper()))

BAD = re.compile(r'^(CL:|LT:|xem |Xem |biến thể|cũng viết|họ [A-ZĐ]|họ$|\(cổ\)|\(cổ văn\)|tên riêng|Họ |dùng trong |cách viết|cũng đọc|cũng phát âm|phát âm khác)')

def clean_gl(gls):
    out = []
    for g in gls:
        g = nfc(g)
        g = re.sub(r'\s*\[[^\]]*\]', '', g)
        g = re.sub(r'\s*\((biến thể|LT:|viết tắt|xem )[^)]*\)', '', g)
        g = re.sub(r'^\((hình thức|dạng) kết hợp\)\s*', '', g)
        if BAD.match(g):
            continue
        g = re.sub(r'\s+', ' ', g).strip(' ;,')
        if g and g not in out:
            out.append(g)
    return out

def norm_py(numeric):
    s = numeric.lower().replace(' ', '').replace('ü', 'v').replace('u:', 'v')
    return s

def vi_meaning(w, numeric, limit=3):
    ents = CV.get(w, [])
    if not ents:
        return ''
    target = norm_py(numeric)
    target5 = re.sub(r'(?<=[a-z])(?=[a-z]|$)', '', target)
    exact = [e for e in ents if target and (e[0] == target or e[0].replace('5', '') == target.replace('5', ''))]
    exact.sort(key=lambda e: e[2])
    rest = sorted([e for e in ents if e not in exact], key=lambda e: e[2])
    gl = []
    for e in exact:
        gl += [g for g in clean_gl(e[1]) if g not in gl]
    if not gl:
        for e in rest:
            gl += [g for g in clean_gl(e[1]) if g not in gl]
    gl = [g for g in gl if not g.startswith('viết tắt')] + [g for g in gl if g.startswith('viết tắt')]
    return '; '.join(gl[:limit])

# ---------- Make Me a Hanzi ----------
MM = {}
for line in open(os.path.join(SRC, 'makemeahanzi', 'dictionary.txt'), encoding='utf8'):
    d = json.loads(line)
    MM[d['character']] = d
IDS = set('⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻')

def components(c):
    d = MM.get(c)
    if not d:
        return []
    dec = d.get('decomposition', '')
    out = []
    for ch in dec:
        if ch in IDS or ch == '？' or ch == c:
            continue
        if ch not in out:
            out.append(ch)
    return out

HINT_VI = {}
for line in open(os.path.join(B, 'hints_vi.txt'), encoding='utf8'):
    if '=' in line:
        c, t = line.rstrip('\n').split('=', 1)
        HINT_VI[c] = t.strip()

# ---------- Topics ----------
TOPICS = [
    ('T', '时间数字', 'Thời gian & số đếm'),
    ('N', '人物家庭', 'Con người & gia đình'),
    ('B', '身体健康', 'Cơ thể & sức khỏe'),
    ('F', '饮食', 'Ăn uống'),
    ('S', '购物', 'Mua sắm, quần áo & tiền'),
    ('H', '家居生活', 'Nhà cửa & sinh hoạt'),
    ('G', '交通出行', 'Giao thông & đi lại'),
    ('P', '方位地点', 'Phương hướng & địa điểm'),
    ('E', '学习', 'Trường học & học tập'),
    ('W', '工作', 'Công việc & kinh tế'),
    ('Z', '自然天气', 'Thời tiết & thiên nhiên'),
    ('R', '爱好娱乐', 'Sở thích, thể thao & du lịch'),
    ('M', '情感性格', 'Cảm xúc & tính cách'),
    ('X', '社交', 'Giao tiếp & xã hội'),
    ('C', '科技媒体', 'Truyền thông & công nghệ'),
    ('A', '动作', 'Hành động thường ngày'),
    ('D', '描述', 'Tính chất & mô tả'),
    ('K', '抽象', 'Khái niệm chung'),
    ('Q', '虚词', 'Từ chức năng (đại từ, phó từ, lượng từ...)'),
]
TAG = {}
for line in open(os.path.join(B, 'topics.txt'), encoding='utf8'):
    if ':' not in line:
        continue
    code, ws = line.split(':', 1)
    for w in ws.split():
        TAG.setdefault(w, code.strip())
FUNC = set('mqrdpcueoy')

def topic_of(w, pos):
    if w in TAG:
        return TAG[w]
    if pos and all(p in FUNC for p in pos):
        return 'Q'
    if 'v' in pos:
        return 'A'
    if 'a' in pos:
        return 'D'
    if 't' in pos:
        return 'T'
    if 'f' in pos or 's' in pos:
        return 'P'
    return 'K'

POS_VI = {'n': 'danh từ', 'v': 'động từ', 'a': 'tính từ', 'd': 'phó từ', 'r': 'đại từ', 'm': 'số từ', 'q': 'lượng từ',
          'p': 'giới từ', 'c': 'liên từ', 'u': 'trợ từ', 'e': 'thán từ', 'y': 'trợ từ ngữ khí', 't': 'từ chỉ thời gian',
          'f': 'từ chỉ phương vị', 's': 'từ chỉ nơi chốn', 'b': 'từ khu biệt', 'nr': 'tên người', 'ns': 'địa danh',
          'o': 'từ tượng thanh', 'i': 'thành ngữ', 'l': 'quán ngữ', 'vn': 'danh động từ', 'an': 'danh tính từ', 'ad': 'phó tính từ'}

# ---------- Words ----------
def load_level(l):
    return json.load(open(os.path.join(SRC, 'complete-hsk-vocabulary', 'wordlists', 'exclusive', 'newest', f'{l}.json'), encoding='utf8'))

PY_OVERRIDE = {
 '了':'le','着':'zhe','重':'zhòng','长':'cháng','转':'zhuǎn','空':'kōng','得':'de','还':'hái','行':'xíng','地':'dì','要':'yào',
 '号':'hào','打':'dǎ','差':'chà','干':'gàn','种':'zhǒng','背':'bèi','数':'shù','吧':'ba','多少':'duō shao','吗':'ma','哪':'nǎ',
 '那':'nà','雨':'yǔ','啊':'a','喂':'wèi','起来':'qǐ lai','出来':'chū lái','告诉':'gào su','妻子':'qī zi','卡':'kǎ','胖':'pàng',
 '为':'wèi','咳':'ké','生意':'shēng yi','趟':'tàng','教':'jiāo','几':'jǐ','故事':'gù shi','好':'hǎo','好吃':'hǎo chī','读':'dú',
 '给':'gěi','看':'kàn','说':'shuō','听':'tīng','鸟':'niǎo','跑':'pǎo','比':'bǐ','离':'lí','远':'yuǎn','把':'bǎ','发':'fā',
 '更':'gèng','角':'jiǎo','脚':'jiǎo','扫':'sǎo','刷':'shuā','女':'nǚ','少':'shǎo','喝':'hē','和':'hé','会':'huì','见':'jiàn',
 '都':'dōu','车':'chē','的':'de','东西':'dōng xi','便宜':'pián yi','分':'fēn','间':'jiān','别':'bié','过':'guò','呢':'ne',
 '当':'dāng','累':'lèi','难':'nán','骑':'qí','页':'yè','脏':'zāng','中':'zhōng','乘':'chéng','凉':'liáng','只':'zhǐ','正':'zhèng',
 '片':'piàn','头':'tóu','子':'zǐ','场':'chǎng','厂':'chǎng','答':'dá','待':'dài','倒':'dǎo','底':'dǐ','将':'jiāng','降':'jiàng',
 '落':'luò','弄':'nòng','强':'qiáng','汤':'tāng','通':'tōng','与':'yǔ','约':'yuē','量':'liàng','嗯':'èn','假':'jiǎ','弹':'tán',
 '鲜':'xiān','赚':'zhuàn','边':'biān','大夫':'dài fu','好处':'hǎo chu','说法':'shuō fa','地方':'dì fang','结果':'jié guǒ',
 '重点':'zhòng diǎn','当时':'dāng shí','教学':'jiào xué','过去':'guò qù','高中':'gāo zhōng','女人':'nǚ rén',
}
JUNK = re.compile(r'^(surname|variant of|old variant|see |used in|unofficial variant|\(bound form\))', re.I)

def pick_form(w):
    s = w['simplified']
    forms = w['forms']
    if s in PY_OVERRIDE:
        for f in forms:
            if f['transcriptions']['pinyin'] == PY_OVERRIDE[s]:
                return f
    good = [f for f in forms if not all(JUNK.match(m) for m in f['meanings'])]
    good = good or forms
    return max(good, key=lambda f: len(f['meanings']))

def alt_forms(w, chosen):
    out = []
    for f in w['forms']:
        if f is chosen or f['transcriptions']['pinyin'] == chosen['transcriptions']['pinyin']:
            continue
        ms = [m for m in f['meanings'] if not JUNK.match(m)]
        if not ms or f['transcriptions']['pinyin'][:1].isupper():
            continue
        vi = vi_meaning(w['simplified'], f['transcriptions']['numeric'], 2)
        if any(o['p'] == f['transcriptions']['pinyin'] for o in out):
            continue
        out.append({'p': f['transcriptions']['pinyin'], 'vi': vi or ms[0]})
    return out[:3]

words = []
chars_needed = []
seen_c = set()
missing_vi = []
for l in range(1, 5):
    for i, w in enumerate(load_level(l)):
        f = pick_form(w)
        s = w['simplified']
        vi = vi_meaning(s, f['transcriptions']['numeric'])
        if not vi and s.endswith('儿'):
            vi = vi_meaning(s[:-1], f['transcriptions']['numeric'].rsplit(' ', 1)[0].replace('r5', ''))
        if not vi:
            vi = vi_meaning(s, '')
        if not vi:
            missing_vi.append(s)
        words.append({
            'id': f'{l}-{i}',
            'w': s,
            'p': f['transcriptions']['pinyin'],
            'n': f['transcriptions']['numeric'],
            'l': l,
            'pos': [POS_VI[p] for p in w['pos'] if p in POS_VI][:2],
            'vi': vi,
            'en': '; '.join(f['meanings'][:2]),
            'hv': word_hv(s),
            'tp': topic_of(s, w['pos']),
            'cl': f.get('classifiers', [])[:2],
            'alt': alt_forms(w, f),
            'q': w.get('frequency', 99999),
        })
        for ch in s:
            if '一' <= ch <= '鿿' and ch not in seen_c:
                seen_c.add(ch)
                chars_needed.append(ch)

# related higher-level words (HSK 5–6)
related = []
for l in (5, 6):
    for w in load_level(l):
        f = pick_form(w)
        s = w['simplified']
        vi = vi_meaning(s, f['transcriptions']['numeric'], 2)
        related.append({'w': s, 'p': f['transcriptions']['pinyin'], 'l': l, 'vi': vi or '; '.join(f['meanings'][:1]), 'hv': word_hv(s)})

# ---------- Characters ----------
TONE = {'ā':('a',1),'á':('a',2),'ǎ':('a',3),'à':('a',4),'ē':('e',1),'é':('e',2),'ě':('e',3),'è':('e',4),'ī':('i',1),'í':('i',2),'ǐ':('i',3),'ì':('i',4),
        'ō':('o',1),'ó':('o',2),'ǒ':('o',3),'ò':('o',4),'ū':('u',1),'ú':('u',2),'ǔ':('u',3),'ù':('u',4),'ǖ':('v',1),'ǘ':('v',2),'ǚ':('v',3),'ǜ':('v',4),'ü':('v',0)}
def to_num(p):
    t = 5; out = ''
    for ch in p.lower():
        if ch in TONE:
            b, tt = TONE[ch]; out += b
            if tt: t = tt
        else:
            out += ch
    return out + str(t)

def char_vi(c, pys):
    for p in pys[:1]:
        v = vi_meaning(c, to_num(p), 3)
        if v:
            return v
    return vi_meaning(c, '', 3)

chars = {}
comp_extra = []
BUCKETS = {}
shutil.rmtree(os.path.join(OUT, 'strokes'), ignore_errors=True)
os.makedirs(os.path.join(OUT, 'strokes'), exist_ok=True)
for c in chars_needed:
    d = MM.get(c, {})
    et = d.get('etymology') or {}
    comps = components(c)
    stroke_file = os.path.join(SRC, 'hanzi-writer-data', f'{c}.json')
    nstrokes = 0
    if os.path.exists(stroke_file):
        sd = json.load(open(stroke_file, encoding='utf8'))
        nstrokes = len(sd.get('strokes', []))
        BUCKETS.setdefault(ord(c) % 16, {})[c] = sd
    chars[c] = {
        'hv': HV.get(c, []),
        'py': d.get('pinyin', []),
        'vi': char_vi(c, d.get('pinyin', [])),
        'en': d.get('definition', ''),
        'rad': d.get('radical', ''),
        'comp': comps,
        'type': et.get('type', ''),
        'sem': et.get('semantic', ''),
        'pho': et.get('phonetic', ''),
        'hint': HINT_VI.get(c, ''),
        'hint_en': et.get('hint', '') if c not in HINT_VI else '',
        'sk': nstrokes,
    }
    for x in comps + [d.get('radical', '')]:
        if x and x not in chars_needed and x not in comp_extra:
            comp_extra.append(x)

# component glossary (for components that are not themselves HSK characters)
comps_info = {}
for x in set(comp_extra) | set(c for ch in chars.values() for c in ch['comp']) | set(ch['rad'] for ch in chars.values()):
    if not x:
        continue
    info = {}
    ri = radical_info(x)
    if ri:
        info['rad'] = ri
    if x in HV:
        info['hv'] = HV[x][0]
    vm = char_vi(x, MM.get(x, {}).get('pinyin', []))
    if vm:
        info['vi'] = vm
    elif MM.get(x, {}).get('definition'):
        info['en'] = MM[x]['definition']
    comps_info[x] = info

# better Vietnamese char meanings: prefer single-character CVDICT entries
for c, info in chars.items():
    if not info['vi']:
        info['vi'] = ''

topics = [{'code': c, 'zh': zh, 'vi': vi, 'count': sum(1 for w in words if w['tp'] == c)} for c, zh, vi in TOPICS]

for b, m in BUCKETS.items():
    json.dump(m, open(os.path.join(OUT, 'strokes', f's{b}.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(words, open(os.path.join(OUT, 'words.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(chars, open(os.path.join(OUT, 'chars.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(comps_info, open(os.path.join(OUT, 'components.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(related, open(os.path.join(OUT, 'related.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump(topics, open(os.path.join(OUT, 'topics.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
json.dump(RAD, open(os.path.join(OUT, 'radicals.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))

print('words', len(words), 'chars', len(chars), 'components', len(comps_info), 'related', len(related))
print('missing vi', len(missing_vi), ' '.join(missing_vi[:80]))
print('missing hv', [w['w'] for w in words if '?' in w['hv']][:50])
print('no strokes', [c for c, v in chars.items() if not v['sk']])
for t in topics:
    print(t['code'], t['vi'], t['count'])
