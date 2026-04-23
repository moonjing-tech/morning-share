import os, requests
from supabase import create_client

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_KEY']
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# 前十大公募基金 App 列表
APPS = [
    # 基金公司官方 App
    {"app_id": "1061838086", "app_name": "现金宝",      "company": "汇添富"},
    {"app_id": "531212368",  "app_name": "天天基金",    "company": "东方财富"},
    {"app_id": "768124701",  "app_name": "易方达e钱包", "company": "易方达"},
    {"app_id": "446353004",  "app_name": "华夏基金管家","company": "华夏基金"},
    {"app_id": "509475928",  "app_name": "南方基金",    "company": "南方基金"},
    {"app_id": "680525846",  "app_name": "广发基金",    "company": "广发基金"},
    {"app_id": "673859685",  "app_name": "富国富钱包",  "company": "富国基金"},
    {"app_id": "714814035",  "app_name": "嘉实理财嘉",  "company": "嘉实基金"},
    {"app_id": "862981607",  "app_name": "招商基金",    "company": "招商基金"},
    {"app_id": "672198904",  "app_name": "博时基金",    "company": "博时基金"},
    {"app_id": "1484459002",  "app_name": "中欧财富",    "company": "中欧基金"},
    
    # 主流基金投资平台
    {"app_id": "1104871195", "app_name": "且慢",        "company": "且慢"},
    {"app_id": "6511224711", "app_name": "涨乐",        "company": "华泰证券"},
    {"app_id": "1025628019", "app_name": "蚂蚁财富",    "company": "蚂蚁集团"},
]

def fetch_app_info(app_id):
    # 先查中国区，再查美国区
    for country in ['cn', 'us']:
        url = f"https://itunes.apple.com/lookup?id={app_id}&country={country}&lang=zh_CN"
        try:
            r = requests.get(url, timeout=15)
            data = r.json()
            if data['resultCount'] > 0:
                print(f"  Found in {country}")
                return data['results'][0]
        except Exception as e:
            print(f"  Error ({country}): {e}")
    return None

for app in APPS:
    print(f"Fetching {app['app_name']}...")
    info = fetch_app_info(app['app_id'])
    if not info:
        continue

    record = {
        "app_id":        app['app_id'],
        "app_name":      info.get('trackName', app['app_name']),
        "company":       app['company'],
        "version":       info.get('version', ''),
        "release_date":  info.get('currentVersionReleaseDate', '')[:10],
        "release_notes": info.get('releaseNotes', '暂无更新说明'),
        "icon_url":      info.get('artworkUrl100', ''),
    }

    # upsert：同一版本不重复插入
    sb.table('app_updates').upsert(
        record,
        on_conflict='app_id,version'
    ).execute()
    print(f"  ✓ {record['app_name']} v{record['version']}")

print("Done!")
