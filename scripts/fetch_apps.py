import os, requests
from supabase import create_client

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_KEY']
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# 前十大公募基金 App 列表
APPS = [
    {"app_id": "1061838086", "app_name": "现金宝", "company": "汇添富"},
    {"app_id": "527113431",  "app_name": "天天基金", "company": "东方财富"},
    {"app_id": "1175098087", "app_name": "易方达基金", "company": "易方达"},
    {"app_id": "1126716492", "app_name": "华夏基金", "company": "华夏基金"},
    {"app_id": "1054872879", "app_name": "南方基金", "company": "南方基金"},
    {"app_id": "1531993539", "app_name": "博时基金", "company": "博时基金"},
    {"app_id": "1052705093", "app_name": "富国基金", "company": "富国基金"},
    {"app_id": "1447218681", "app_name": "嘉实财富", "company": "嘉实基金"},
    {"app_id": "1498322836", "app_name": "广发基金", "company": "广发基金"},
    {"app_id": "1454488621", "app_name": "招商基金", "company": "招商基金"},
]

def fetch_app_info(app_id):
    url = f"https://itunes.apple.com/lookup?id={app_id}&country=cn&lang=zh_CN"
    try:
        r = requests.get(url, timeout=15)
        data = r.json()
        if data['resultCount'] == 0:
            return None
        return data['results'][0]
    except Exception as e:
        print(f"Error fetching {app_id}: {e}")
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
