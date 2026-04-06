import os
import re
from collections import defaultdict

def generate_conclusions():
    card_dir = 'content/card/ai'
    daily = defaultdict(list)
    for f in os.listdir(card_dir):
        if not f.endswith('.md') or f == '19700102-ai-01.md': continue
        p = os.path.join(card_dir, f)
        with open(p, 'r', encoding='utf-8') as file: c = file.read()
        pm = re.search(r"published:\s*'(\d{4}-\d{2}-\d{2})T", c)
        tm = re.search(r'title:\s*"(.*?)"', c)
        if pm and tm:
            daily[pm.group(1)].append(tm.group(1))
        else:
            pm2 = re.search(r"published:\s*(\d{4}-\d{2}-\d{2})", c)
            if pm2 and tm:
                daily[pm2.group(1)].append(tm.group(1))

    lines = ["---", "school_slug: \"ai\"", "daily:"]
    for d in sorted(daily.keys()):
        lines.append(f'  "{d}": |')
        lines.append(f'    # 人工智能学院 {d} 每日总结')
        lines.append('')
        titles = sorted(list(set(daily[d])))
        for t in titles[:10]:
            lines.append(f'    - {t}')
    
    lines.append("---")
    lines.append("")
    lines.append("# 人工智能学院总结")
    lines.append("")
    lines.append("- 默认总结用于无指定日期时展示。")
    lines.append("- 可在 daily 字段中按日期覆盖。")

    with open('content/conclusion/ai.md', 'w', encoding='utf-8') as fo:
        fo.write("\n".join(lines))

if __name__ == '__main__':
    generate_conclusions()
