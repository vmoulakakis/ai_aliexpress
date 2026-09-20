import os,time,requests
from urllib.parse import quote

AUDIENCE="ai-aliexpress-vmdb-worker"
FUNCTION_URL=os.getenv(
    "VMDB_WORKER_GATEWAY",
    "https://gqpbskssrvpfjtujwezc.supabase.co/functions/v1/ai-aliexpress-worker-gateway",
)
_token=None
_token_at=0.0

def _oidc_token(force=False):
    global _token,_token_at
    if _token and not force and time.time()-_token_at<180:
        return _token
    url=os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL")
    request_token=os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not url or not request_token:
        raise RuntimeError("GitHub OIDC unavailable; workflow needs id-token: write")
    sep="&" if "?" in url else "?"
    r=requests.get(f"{url}{sep}audience={quote(AUDIENCE)}",headers={"Authorization":f"Bearer {request_token}"},timeout=30)
    r.raise_for_status()
    _token=r.json()["value"];_token_at=time.time()
    return _token

def db_call(method,resource,params=None,data=None,prefer=None):
    payload={"method":method,"resource":resource}
    if params:payload["params"]=params
    if data is not None:payload["data"]=data
    if prefer:payload["prefer"]=prefer
    for attempt in range(2):
        token=_oidc_token(force=attempt>0)
        r=requests.post(FUNCTION_URL,headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"},json=payload,timeout=180)
        if r.status_code==401 and attempt==0:
            continue
        if not r.ok:
            raise RuntimeError(f"VMDB gateway HTTP {r.status_code}: {r.text[:1500]}")
        body=r.json()
        if not body.get("ok"):raise RuntimeError(body)
        return body.get("result")
    raise RuntimeError("OIDC gateway authentication failed")
