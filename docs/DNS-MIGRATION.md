# DNS Migration Guide: Squarespace to AWS Route 53

This guide provides step-by-step instructions for migrating the `pitfal.solutions` domain DNS from Squarespace to AWS Route 53.

## Document Info
- **Version:** 1.0
- **Last Updated:** January 2026
- **Status:** Ready for Migration

---

## 1. Before You Begin

### Prerequisites

- [ ] AWS account with CLI configured (`aws configure --profile pitfal`)
- [ ] Access to Squarespace domain settings (admin login)
- [ ] Access to Google Workspace admin (for email settings)
- [ ] Terraform CLI installed

### Estimated Timeline

| Phase | Duration |
|-------|----------|
| Setup Route 53 & recreate records | 30 minutes |
| Switch nameservers | 5 minutes |
| DNS propagation | 1-48 hours (typically 1-4 hours) |
| Verification & monitoring | 24 hours |

### When to Migrate

- **Best time:** Weekend evening or low-traffic period
- **Avoid:** Before important client shoots or during active campaigns
- **Why:** DNS propagation can cause brief inconsistencies during transition

---

## 2. Pre-Migration Checklist

### Step 2.1: Document Current DNS Records

Log into Squarespace and export/screenshot your current DNS settings.

**Navigation:** Squarespace Dashboard → Domains → pitfal.solutions → DNS Settings

Record all existing entries in this table:

| Type | Host/Name | Value/Points To | Priority | TTL |
|------|-----------|-----------------|----------|-----|
| A | @ | (IP address) | - | |
| CNAME | www | (target) | - | |
| MX | @ | (mail server) | (priority) | |
| TXT | @ | (SPF record) | - | |
| TXT | (DKIM selector) | (DKIM value) | - | |

### Step 2.2: Verify Your Current Setup

| Item | Your Current State |
|------|-------------------|
| **Domain Registrar** | Squarespace |
| **Email Provider** | Google Workspace |
| **Current Hosting** | Squarespace (migrating to AWS) |

### Step 2.3: Identify Critical Records

**Must Preserve:**
- [ ] MX records (email delivery)
- [ ] SPF record (email authentication)
- [ ] DKIM records (email signing)
- [ ] Any verification TXT records (Google Search Console, etc.)

---

## 3. Create Route 53 Hosted Zone

### Step 3.1: Create the Hosted Zone

**Option A: AWS Console**

1. Go to [Route 53 Console](https://console.aws.amazon.com/route53)
2. Click **Hosted zones** in the left sidebar
3. Click **Create hosted zone**
4. Enter:
   - Domain name: `pitfal.solutions`
   - Type: **Public hosted zone**
5. Click **Create hosted zone**
6. **Important:** Note the 4 NS (nameserver) records created

**Option B: AWS CLI**

```bash
# Set your profile
export AWS_PROFILE=pitfal

# Create hosted zone
aws route53 create-hosted-zone \
  --name pitfal.solutions \
  --caller-reference "pitfal-$(date +%s)" \
  --query 'HostedZone.Id' \
  --output text

# Example output: /hostedzone/Z1234567890ABC
```

### Step 3.2: Note Your Nameservers

Get the NS records for your new hosted zone:

```bash
# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name pitfal.solutions \
  --query 'HostedZones[0].Id' \
  --output text | sed 's|/hostedzone/||')

echo "Zone ID: $ZONE_ID"

# Get nameservers
aws route53 get-hosted-zone \
  --id $ZONE_ID \
  --query 'DelegationSet.NameServers'
```

**Example output:**
```json
[
    "ns-123.awsdns-45.com",
    "ns-678.awsdns-90.net",
    "ns-111.awsdns-22.org",
    "ns-333.awsdns-44.co.uk"
]
```

**Save these nameservers** - you'll need them in Step 6.

---

## 4. Recreate DNS Records in Route 53

### Step 4.1: A Record (Root Domain)

For CloudFront distribution (after infrastructure is deployed):

**Console:**
1. Select your hosted zone
2. Click **Create record**
3. Configure:
   - Record name: (leave empty for root)
   - Record type: **A**
   - Toggle **Alias** ON
   - Route traffic to: **Alias to CloudFront distribution**
   - Select your distribution

**CLI:**
```bash
# Get CloudFront distribution domain
CF_DOMAIN=$(cd infrastructure/terraform && terraform output -raw cloudfront_domain_name)

# Create A record (alias to CloudFront)
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "pitfal.solutions",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "'$CF_DOMAIN'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

> **Note:** `Z2FDTNDATAQYW2` is the fixed hosted zone ID for all CloudFront distributions.

### Step 4.2: CNAME Record (www subdomain)

**Console:**
1. Click **Create record**
2. Configure:
   - Record name: `www`
   - Record type: **CNAME**
   - Value: `pitfal.solutions`
   - TTL: 300

**CLI:**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.pitfal.solutions",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "pitfal.solutions"}]
      }
    }]
  }'
```

### Step 4.3: MX Records (Google Workspace Email) - CRITICAL

These records ensure email continues to work. **Do not skip this step.**

**Standard Google Workspace MX Records:**

| Priority | Mail Server |
|----------|-------------|
| 1 | ASPMX.L.GOOGLE.COM |
| 5 | ALT1.ASPMX.L.GOOGLE.COM |
| 5 | ALT2.ASPMX.L.GOOGLE.COM |
| 10 | ALT3.ASPMX.L.GOOGLE.COM |
| 10 | ALT4.ASPMX.L.GOOGLE.COM |

**Console:**
1. Click **Create record**
2. Configure:
   - Record name: (leave empty)
   - Record type: **MX**
   - TTL: 3600
   - Value (one per line):
     ```
     1 ASPMX.L.GOOGLE.COM
     5 ALT1.ASPMX.L.GOOGLE.COM
     5 ALT2.ASPMX.L.GOOGLE.COM
     10 ALT3.ASPMX.L.GOOGLE.COM
     10 ALT4.ASPMX.L.GOOGLE.COM
     ```

**CLI:**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "pitfal.solutions",
        "Type": "MX",
        "TTL": 3600,
        "ResourceRecords": [
          {"Value": "1 ASPMX.L.GOOGLE.COM"},
          {"Value": "5 ALT1.ASPMX.L.GOOGLE.COM"},
          {"Value": "5 ALT2.ASPMX.L.GOOGLE.COM"},
          {"Value": "10 ALT3.ASPMX.L.GOOGLE.COM"},
          {"Value": "10 ALT4.ASPMX.L.GOOGLE.COM"}
        ]
      }
    }]
  }'
```

### Step 4.4: TXT Records (SPF - Email Authentication)

SPF prevents email spoofing and improves deliverability.

**Console:**
1. Click **Create record**
2. Configure:
   - Record name: (leave empty)
   - Record type: **TXT**
   - TTL: 3600
   - Value: `"v=spf1 include:_spf.google.com ~all"`

**CLI:**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "pitfal.solutions",
        "Type": "TXT",
        "TTL": 3600,
        "ResourceRecords": [{"Value": "\"v=spf1 include:_spf.google.com ~all\""}]
      }
    }]
  }'
```

### Step 4.5: DKIM Records (Email Signing)

Get your DKIM records from Google Workspace Admin:

1. Go to [Google Admin Console](https://admin.google.com)
2. Navigate: Apps → Google Workspace → Gmail → Authenticate email
3. Select your domain
4. Copy the DKIM record value

**Console:**
1. Click **Create record**
2. Configure:
   - Record name: `google._domainkey` (or your selector)
   - Record type: **TXT**
   - TTL: 3600
   - Value: (paste from Google Admin)

**CLI:**
```bash
# Replace DKIM_VALUE with your actual DKIM record
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "google._domainkey.pitfal.solutions",
        "Type": "TXT",
        "TTL": 3600,
        "ResourceRecords": [{"Value": "\"YOUR_DKIM_VALUE_HERE\""}]
      }
    }]
  }'
```

### Step 4.6: Additional TXT Records

Add any other TXT records from Squarespace (domain verification, etc.):

```bash
# Example: Google Search Console verification
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "pitfal.solutions",
        "Type": "TXT",
        "TTL": 3600,
        "ResourceRecords": [{"Value": "\"google-site-verification=YOUR_VALUE\""}]
      }
    }]
  }'
```

> **Note:** You can have multiple TXT records on the same domain. Route 53 will combine them.

---

## 5. SSL Certificate (ACM)

### Step 5.1: Request Certificate

CloudFront requires certificates in **us-east-1**.

**Console:**
1. Go to [ACM Console](https://console.aws.amazon.com/acm/home?region=us-east-1)
2. Ensure region is **US East (N. Virginia)**
3. Click **Request a certificate**
4. Select **Request a public certificate**
5. Enter domain names:
   - `pitfal.solutions`
   - `*.pitfal.solutions` (wildcard for subdomains)
6. Select **DNS validation**
7. Click **Request**

**CLI:**
```bash
aws acm request-certificate \
  --domain-name pitfal.solutions \
  --subject-alternative-names "*.pitfal.solutions" \
  --validation-method DNS \
  --region us-east-1
```

### Step 5.2: Add Validation Records

ACM will provide CNAME records for validation.

**Console:**
1. In ACM, click your pending certificate
2. Click **Create records in Route 53** (automatic)
3. Or manually add the CNAME records shown

**CLI:**
```bash
# Get certificate ARN
CERT_ARN=$(aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='pitfal.solutions'].CertificateArn" \
  --output text)

# Get validation CNAME details
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions'
```

### Step 5.3: Verify Certificate Status

Wait for validation (usually 5-30 minutes):

```bash
# Check status
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status'

# Expected: "ISSUED"
```

---

## 6. Update Nameservers

### Option A: Domain Registered with Squarespace (Your Setup)

Since pitfal.solutions is registered with Squarespace, you'll change the nameservers there.

**Steps:**

1. Log into [Squarespace](https://squarespace.com)
2. Go to **Settings** → **Domains**
3. Click on **pitfal.solutions**
4. Click **DNS Settings** (or **Advanced Settings**)
5. Look for **Nameservers** section
6. Click **Use custom nameservers** (or similar)
7. Enter the 4 Route 53 nameservers:
   ```
   ns-XXX.awsdns-XX.com
   ns-XXX.awsdns-XX.net
   ns-XXX.awsdns-XX.org
   ns-XXX.awsdns-XX.co.uk
   ```
8. Save changes

> **Important:** DNS propagation starts immediately but can take 1-48 hours to complete globally.

### Option B: Domain Registered Elsewhere

If your domain is registered with another registrar:

**GoDaddy:**
1. My Products → Domain → DNS → Nameservers → Change
2. Select "Custom" and enter Route 53 NS records

**Namecheap:**
1. Domain List → Manage → Nameservers
2. Select "Custom DNS" and enter Route 53 NS records

**Google Domains:**
1. DNS → Custom name servers
2. Enter Route 53 NS records

---

## 7. Post-Migration Verification

### Step 7.1: Check DNS Propagation

**Using dig (macOS/Linux):**
```bash
# Check nameservers
dig NS pitfal.solutions +short
# Should show Route 53 nameservers

# Check A record
dig A pitfal.solutions +short
# Should show CloudFront IP(s)

# Check MX records
dig MX pitfal.solutions +short
# Should show Google mail servers

# Check from different DNS servers
dig @8.8.8.8 NS pitfal.solutions +short   # Google DNS
dig @1.1.1.1 NS pitfal.solutions +short   # Cloudflare DNS
```

**Using nslookup (Windows/all platforms):**
```bash
nslookup -type=NS pitfal.solutions
nslookup -type=MX pitfal.solutions
nslookup -type=A pitfal.solutions
```

**Online Tools:**
- [whatsmydns.net](https://www.whatsmydns.net/) - Global propagation check
- [dnschecker.org](https://dnschecker.org/) - Multiple record types
- [mxtoolbox.com](https://mxtoolbox.com/) - Email-specific checks

### Step 7.2: Verify Website

```bash
# Check HTTPS works
curl -I https://pitfal.solutions
curl -I https://www.pitfal.solutions

# Check for redirects
curl -IL http://pitfal.solutions

# Expected: 200 OK with valid SSL
```

**Browser check:**
1. Open https://www.pitfal.solutions in incognito/private window
2. Verify no SSL warnings
3. Check that the lock icon appears
4. Click lock icon to verify certificate details

### Step 7.3: Test Email (CRITICAL)

**Send test emails:**
1. Send email FROM your pitfal.solutions address to a Gmail account
2. Send email TO your pitfal.solutions address from external account
3. Check spam folder - email should not be flagged

**Verify email headers:**
1. Open received email
2. View original/headers
3. Look for:
   - `SPF: pass`
   - `DKIM: pass`
   - `DMARC: pass` (if configured)

**MX Toolbox verification:**
1. Go to [mxtoolbox.com/emailhealth](https://mxtoolbox.com/emailhealth)
2. Enter `pitfal.solutions`
3. Verify all checks pass

### Step 7.4: Verification Checklist

| Check | Command/Method | Expected Result |
|-------|----------------|-----------------|
| NS records | `dig NS pitfal.solutions` | Route 53 nameservers |
| A record | `dig A pitfal.solutions` | CloudFront IPs |
| Website loads | Browser test | Site displays correctly |
| SSL valid | Check lock icon | Valid certificate |
| MX records | `dig MX pitfal.solutions` | Google mail servers |
| Send email | Send test | Delivered, not spam |
| Receive email | Receive test | Delivered to inbox |
| SPF check | Email headers | SPF: pass |

---

## 8. Troubleshooting

### DNS Not Propagating

**Symptoms:** Old site still showing, dig shows old nameservers

**Solutions:**
1. **Wait longer** - Can take up to 48 hours
2. **Clear local DNS cache:**
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Windows
   ipconfig /flushdns
   ```
3. **Try different DNS resolver:**
   ```bash
   dig @8.8.8.8 pitfal.solutions
   ```
4. **Verify nameservers were saved** in Squarespace

### SSL Certificate Issues

**Symptoms:** Browser shows "Not Secure", certificate errors

**Solutions:**
1. **Verify certificate is ISSUED:**
   ```bash
   aws acm describe-certificate \
     --certificate-arn $CERT_ARN \
     --region us-east-1 \
     --query 'Certificate.Status'
   ```
2. **Check certificate is attached to CloudFront:**
   - Console: CloudFront → Distribution → General → SSL Certificate
3. **Verify DNS validation records exist:**
   ```bash
   aws route53 list-resource-record-sets \
     --hosted-zone-id $ZONE_ID \
     --query "ResourceRecordSets[?Type=='CNAME']"
   ```
4. **Request new certificate** if validation failed

### Email Delivery Problems

**Symptoms:** Email not received, going to spam, bouncing

**Solutions:**

1. **Verify MX records:**
   ```bash
   dig MX pitfal.solutions +short
   # Must show Google servers
   ```

2. **Check SPF record:**
   ```bash
   dig TXT pitfal.solutions +short | grep spf
   # Must show: "v=spf1 include:_spf.google.com ~all"
   ```

3. **Verify DKIM in Google Admin:**
   - Admin Console → Apps → Gmail → Authenticate email
   - Start authentication if not active

4. **Test with Mail Tester:**
   - Go to [mail-tester.com](https://www.mail-tester.com/)
   - Send email to provided address
   - Check score and fix issues

### Website Showing Old Content

**Symptoms:** New site deployed but old content appears

**Solutions:**
1. **Clear CloudFront cache:**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id YOUR_DIST_ID \
     --paths "/*" \
     --no-cli-pager
   ```
2. **Clear browser cache** or use incognito
3. **Check DNS is pointing to CloudFront:**
   ```bash
   dig A pitfal.solutions +short
   ```

### Rollback Procedure

If something goes wrong, you can revert to Squarespace DNS:

1. **Log into Squarespace**
2. Go to Domains → pitfal.solutions → DNS Settings
3. Change back to **Squarespace nameservers** (or default)
4. Wait for propagation (1-48 hours)

> **Note:** Keep Route 53 hosted zone intact during rollback - you only pay ~$0.50/month and can retry migration later.

---

## 9. Cleanup

### When to Clean Up

Only proceed with cleanup after:
- [ ] DNS fully propagated (48+ hours)
- [ ] Website working correctly
- [ ] Email sending and receiving properly
- [ ] SSL certificate valid
- [ ] No issues for at least 1 week

### Squarespace DNS Settings

After successful migration:
1. You can leave DNS settings in Squarespace (they're now ignored)
2. Or remove custom records (not nameservers)

### Squarespace Hosting

If you were hosting the website on Squarespace:
1. Keep site active during transition
2. Cancel hosting subscription only after verifying AWS site works
3. Export any content you want to keep

### Cost Considerations

| Service | Cost |
|---------|------|
| Route 53 Hosted Zone | $0.50/month |
| Route 53 Queries | ~$0.40/million queries |
| Squarespace Domain Registration | (keep if registered there) |

---

## 10. Quick Reference

### Key Commands

```bash
# Set profile
export AWS_PROFILE=pitfal

# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name pitfal.solutions \
  --query 'HostedZones[0].Id' \
  --output text | sed 's|/hostedzone/||')

# List all records
aws route53 list-resource-record-sets --hosted-zone-id $ZONE_ID

# Check DNS propagation
dig NS pitfal.solutions +short
dig A pitfal.solutions +short
dig MX pitfal.solutions +short
```

### Important Links

| Resource | URL |
|----------|-----|
| Route 53 Console | https://console.aws.amazon.com/route53 |
| ACM Console (us-east-1) | https://console.aws.amazon.com/acm/home?region=us-east-1 |
| Squarespace Domains | https://account.squarespace.com/domains |
| Google Admin Console | https://admin.google.com |
| DNS Propagation Check | https://www.whatsmydns.net |
| MX Toolbox | https://mxtoolbox.com |

### Route 53 Nameserver Format

Your nameservers will look like:
```
ns-XXXX.awsdns-XX.com
ns-XXXX.awsdns-XX.net
ns-XXXX.awsdns-XX.org
ns-XXXX.awsdns-XX.co.uk
```

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude Code | Initial guide for Squarespace to Route 53 migration |
