sudo apt update
sudo apt install bind9 bind9utils bind9-doc -
y
sudo nano /etc/bind/named.conf.options
options {
    directory "/var/cache/bind";
    recursion no;
    allow-query { any; };
    listen-on { any; }

;
zone "yourdomain.com" {
    type master;
    file "/etc/bind/zones/db.yourdomain.com";

};
};
sudo mkdir /etc/bind/zones
sudo mkdir /etc/bind/zones
$TTL 86400
@   IN  SOA ns1.yourdomain.com. admin.yourdomain.com. (
        2025090401 ; Serial
        3600       ; Refresh
        1800       ; Retry
        1209600    ; Expire
        86400 )    ; Minimum TTL
;
@       IN  NS      ns1.yourdomain.com.
ns1     IN  A       192.168.1.100
@       IN  A       192.168.1.100
www     IN  A       19
2.168.1.100
sudo systemctl restart bind9
sudo systemctl enable bind

9
from dnslib import DNSRecord, QTYPE, RR, A
from dnslib.server import DNSServer

# Custom DNS resolver
class MyResolver:
    def resolve(self, request, handler):
        qname = request.q.qname
        qtype = QTYPE[request.q.qtype]

        print(f"Received query: {qname} Type: {qtype}")

        # Example: Always resolve to 127.0.0.1
        reply = request.reply()
        if qtype == "A":  # IPv4 Address
            reply.add_answer(RR(rname=qname, rtype=QTYPE.A, rclass=1, ttl=60,
                                rdata=A("127.0.0.1")))
        return reply

# Run DNS server on port 5353
resolver = MyResolver()
dns_server = DNSServer(resolver, port=5353, address="0.0.0.0", tcp=True)
dns_server.start_thread()

print("DNS Server running on port 5353...")
import time
whil
e True:
    time.sleep(1)
