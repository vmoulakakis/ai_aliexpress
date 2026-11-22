"""Opt-in integration probes; no inference, ingestion, purchases or review quota."""
import json,os,unittest,urllib.request,urllib.error
API='https://gqpbskssrvpfjtujwezc.supabase.co/functions/v1/axi-catalog'
KEY=os.getenv('AXI_CATALOG_ANON_KEY')
@unittest.skipUnless(KEY,'AXI public read credential not supplied')
class AxiLiveTests(unittest.TestCase):
 def request(self,path='',auth=True,method='GET',body=None,url=API):
  headers={'Authorization':'Bearer '+KEY,'apikey':KEY} if auth else {}
  if body is not None:headers['Content-Type']='application/json'
  req=urllib.request.Request(url+path,headers=headers,method=method,data=json.dumps(body).encode() if body is not None else None)
  try:
   with urllib.request.urlopen(req,timeout=25) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
 def test_axi_source_and_cursor(self):
  status,data=self.request('?limit=2');self.assertEqual(status,200)
  self.assertEqual(data['source'],'axi');self.assertGreater(data['summary']['products'],0)
  self.assertEqual(len(data['items']),2)
  self.assertNotIn('source_payload',data['items'][0]);self.assertNotIn('response_data',data['items'][0])
  _,nxt=self.request('?limit=2&after='+str(data['next_cursor']))
  self.assertTrue(set(p['id'] for p in data['items']).isdisjoint(p['id'] for p in nxt['items']))
 def test_authentication_and_private_rpc(self):
  self.assertEqual(self.request(auth=False)[0],401)
  url='https://gqpbskssrvpfjtujwezc.supabase.co/rest/v1/rpc/axi_catalog_read'
  self.assertIn(self.request(url=url,method='POST',body={'p_limit':1})[0],[401,403,404])
 def test_parameter_and_method_bounds(self):
  for path in ['?limit=61','?after=-1','?id=invalid','?table=vault.secrets','?problem=a%27']:
   self.assertEqual(self.request(path)[0],400)
  self.assertEqual(self.request(method='POST',body={})[0],405)
 def test_detail_identity_and_no_fabricated_verification(self):
  _,data=self.request('?id=1005013174195632&limit=1');p=data['items'][0]
  self.assertEqual(p['aliexpress_product_id'],'1005013174195632')
  self.assertEqual(p['source_url'],'https://www.aliexpress.com/item/1005013174195632.html')
  self.assertEqual(p['review_status'],'PENDING_REVIEW')
  self.assertEqual(p['affiliate_status'],'API_GENERATED_NOT_REDIRECT_VERIFIED')
if __name__=='__main__':unittest.main()
