const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:4000/api/v1';

// Helper to make HTTP requests
function request(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${pathUrl}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

// Results accumulator
const results = [];
function recordResult(testNum, title, passed, details = '') {
  results.push({ testNum, title, passed, details });
  console.log(`[TEST ${testNum}] ${passed ? '✅ PASS' : '❌ FAIL'}: ${title}`);
  if (details) console.log(`   -> ${details}`);
}

async function runAcceptanceSuite() {
  console.log('================================================================');
  console.log('HELLO-Hi — MILESTONE 3: MERCHANT PROFILE & KYC ACCEPTANCE SUITE');
  console.log('================================================================\n');

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Mobile-Number-Only OTP Registration & Direct Dashboard Navigation
    // ------------------------------------------------------------------------
    const testPhone = `+9198480${Math.floor(10000 + Math.random() * 90000)}`;
    const sendOtpRes = await request('POST', '/auth/otp/send', {
      phoneNumber: testPhone,
      role: 'MERCHANT',
    });

    const challengeId = sendOtpRes.data?.data?.challengeId;
    const devOtp = sendOtpRes.data?.data?.devOtp;

    const verifyOtpRes = await request('POST', '/auth/otp/verify', {
      challengeId,
      otp: devOtp,
      deviceInfo: 'Merchant Simulator Browser',
    });

    const merchantToken = verifyOtpRes.data?.data?.accessToken;
    const test1UserId = verifyOtpRes.data?.data?.user?.id;
    const test1Pass =
      (verifyOtpRes.status === 200 || verifyOtpRes.status === 201) && !!merchantToken;

    recordResult(
      1,
      'Mobile-Number-Only OTP Registration Flow',
      test1Pass,
      `Registered with phone only (${testPhone}). Token issued: ${merchantToken?.slice(0, 15)}... No upfront personal/KYC fields demanded.`
    );

    const authHeaders = {
      Authorization: `Bearer ${merchantToken}`,
      'x-user-id': test1UserId || 'user-vendor-pilot',
    };

    // Create a fresh test business for the registered merchant
    const createBizRes = await request(
      'POST',
      '/merchant/businesses',
      {
        name: 'Pilot Super Diner',
        categorySlug: 'restaurants',
        categoryName: 'Restaurants & Cafes',
        description: 'Authentic local cuisine, fresh dining and restaurant services',
        primaryPhone: testPhone,
      },
      authHeaders
    );
    const createdBizList = Array.isArray(createBizRes.data?.data) ? createBizRes.data.data : [];
    const testBusiness = createdBizList.find((b) => b.name === 'Pilot Super Diner') || createdBizList[0];
    const testBusinessId = testBusiness ? testBusiness.id : 'biz-1';
    console.log(`\nActive Fresh Test Business ID: ${testBusinessId} (Owner: ${test1UserId})\n`);

    // ------------------------------------------------------------------------
    // TEST 2: Dashboard Profile Completion Reminder Toast & State
    // ------------------------------------------------------------------------
    const completionRes = await request(
      'GET',
      '/merchant/profile/completion',
      null,
      authHeaders
    );
    const compData = completionRes.data?.data || completionRes.data;
    const test2Pass =
      completionRes.status === 200 &&
      compData &&
      compData.showReminder === true &&
      typeof (compData.completionPercentage ?? compData.percentage) === 'number' &&
      Array.isArray(compData.missingFields || compData.pendingRequirements);

    recordResult(
      2,
      'Dashboard Profile Completion Reminder Behavior',
      test2Pass,
      `Completion: ${compData?.completionPercentage ?? compData?.percentage}%, showReminder: ${compData?.showReminder}, Pending: [${(compData?.missingFields || compData?.pendingRequirements || []).join(', ')}]`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Profile Persistence & Section Independence Across Database
    // ------------------------------------------------------------------------
    const updatedName = `Pilot Super Diner ${Date.now() % 10000}`;
    const patchBizRes = await request(
      'PATCH',
      `/merchant/businesses/${testBusinessId}`,
      {
        name: updatedName,
        addressLine1: 'Plot 42, Silicon Valley, Hitec City',
        cityName: 'Hyderabad',
        pincode: '500081',
      },
      authHeaders
    );

    // Update Personal Profile independently with unique email
    const testEmail = `pilot.merchant.${Date.now() % 100000}@hello-hi.in`;
    const putPersonalRes = await request(
      'PUT',
      '/merchant/profile',
      {
        fullName: 'Vinod Pilot Merchant',
        email: testEmail,
        aadhaarNumber: '999988881234',
      },
      authHeaders
    );

    // Verify retrieval: personal profile
    const getProfileRes = await request('GET', '/merchant/profile', null, authHeaders);
    const profData = getProfileRes.data?.data || getProfileRes.data;

    // Verify retrieval: business profile
    const getBizRes = await request('GET', '/merchant/businesses', null, authHeaders);
    const updatedBizList = Array.isArray(getBizRes.data?.data)
      ? getBizRes.data.data
      : (Array.isArray(getBizRes.data) ? getBizRes.data : []);
    const matchedBiz = updatedBizList.find((b) => b.id === testBusinessId) || updatedBizList[0];

    const test3Pass =
      profData?.user?.fullName === 'Vinod Pilot Merchant' &&
      profData?.user?.email === testEmail &&
      matchedBiz?.name === updatedName &&
      matchedBiz?.addressLine1 === 'Plot 42, Silicon Valley, Hitec City';

    recordResult(
      3,
      'Profile Persistence & Section Independence',
      test3Pass,
      `Personal details and business/address saved independently in MySQL without collision.`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Sensitive Identity Number Masking
    // ------------------------------------------------------------------------
    const maskedAadhaar = profData?.user?.aadhaarNumber || profData?.user?.identityProofNumber;
    const test4Pass = maskedAadhaar === 'XXXX-XXXX-1234';

    recordResult(
      4,
      'Sensitive Identity Number Masking (Aadhaar & PAN)',
      test4Pass,
      `Aadhaar masked as '${maskedAadhaar}' in API response.`
    );

    // ------------------------------------------------------------------------
    // TEST 5: Multi-Tenant KYC Isolation (Cross-Merchant Access Protection)
    // ------------------------------------------------------------------------
    const unauthorizedHeaders = {
      Authorization: `Bearer mock-token-other`,
      'x-user-id': 'unauthorized-intruder-user',
    };

    const crossUploadRes = await request(
      'POST',
      `/merchant/businesses/${testBusinessId}/documents`,
      {
        documentCategory: 'BUSINESS_PROOF',
        documentType: 'GSTIN Certificate',
        documentNumber: '36AAAAA0000A1Z5',
      },
      unauthorizedHeaders
    );

    const crossSubmitRes = await request(
      'POST',
      `/merchant/businesses/${testBusinessId}/kyc/submit`,
      {},
      unauthorizedHeaders
    );

    const test5Pass = crossUploadRes.status === 403 && crossSubmitRes.status === 403;
    recordResult(
      5,
      'Multi-Tenant KYC Access Isolation',
      test5Pass,
      `Unauthorized merchant received 403 Forbidden on foreign business access.`
    );

    // ------------------------------------------------------------------------
    // TEST 6: File Validation (Size and MIME limits)
    // ------------------------------------------------------------------------
    // 6a: Reject invalid mime type (e.g. text/html or executable)
    const badMimeRes = await request(
      'POST',
      `/merchant/businesses/${testBusinessId}/documents`,
      {
        documentCategory: 'BUSINESS_PROOF',
        documentType: 'GSTIN Certificate',
        fileDataUri: 'data:text/html;base64,PGh0bWw+aGFja2VkPC9odG1sPg==',
        fileName: 'exploit.html',
      },
      authHeaders
    );

    // 6b: Reject file over 5MB limit
    const hugePayload = 'data:image/jpeg;base64,' + 'A'.repeat(7 * 1024 * 1024);
    const hugeFileRes = await request(
      'POST',
      `/merchant/businesses/${testBusinessId}/documents`,
      {
        documentCategory: 'BUSINESS_PROOF',
        documentType: 'GSTIN Certificate',
        fileDataUri: hugePayload,
        fileName: 'huge.jpg',
      },
      authHeaders
    );

    const test6Pass = badMimeRes.status === 400 && (hugeFileRes.status === 400 || hugeFileRes.status === 413);
    recordResult(
      6,
      'Server-Side KYC File Validation & MIME Restrictions',
      test6Pass,
      `Invalid MIME rejected with HTTP ${badMimeRes.status}; >5MB payload rejected with HTTP ${hugeFileRes.status}.`
    );

    // ------------------------------------------------------------------------
    // TEST 7: Private KYC Storage & Authenticated Streaming
    // ------------------------------------------------------------------------
    // Upload a valid PDF document
    const samplePdfBase64 =
      'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE4IDAwMDAwIG4gCjAwMDAwMDAwNzcgMDAwMDAgbiAKMDAwMDAwMDEzNyAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIxOQolJUVPRg==';

    const validUploadRes = await request(
      'POST',
      `/merchant/businesses/${testBusinessId}/documents`,
      {
        documentCategory: 'BUSINESS_PROOF',
        documentType: 'Shop & Establishment Certificate',
        documentNumber: 'SE-HYD-998877',
        fileDataUri: samplePdfBase64,
        fileName: 'shop_act_reg.pdf',
      },
      authHeaders
    );

    const docList = Array.isArray(validUploadRes.data?.data)
      ? validUploadRes.data.data
      : (Array.isArray(validUploadRes.data) ? validUploadRes.data : []);
    const uploadedDoc = docList.find((d) => d.documentType === 'Shop & Establishment Certificate') || docList[0];

    // Test authenticated streaming route
    let streamRes = null;
    if (uploadedDoc) {
      streamRes = await request(
        'GET',
        `/merchant/businesses/${testBusinessId}/documents/${uploadedDoc.id}/file`,
        null,
        authHeaders
      );
    }

    const test7Pass =
      (validUploadRes.status === 200 || validUploadRes.status === 201) &&
      !!uploadedDoc &&
      streamRes &&
      streamRes.status === 200 &&
      streamRes.headers['content-type'] === 'application/pdf';

    recordResult(
      7,
      'Private Storage & Authenticated Document Streaming',
      test7Pass,
      `File stored in private_kyc; streamed securely via authenticated controller stream.`
    );

    // ------------------------------------------------------------------------
    // TEST 8: Category-Specific Statutory License Server-Side Enforcement
    // ------------------------------------------------------------------------
    // The business category is Restaurants & Cafes ('restaurants').
    // Food businesses require FSSAI License by statute!
    // Attempt submit with ONLY Shop Act (no FSSAI):
    const failSubmitRes = await request(
      'POST',
      `/merchant/businesses/${testBusinessId}/kyc/submit`,
      {},
      authHeaders
    );

    const submitBlocked =
      failSubmitRes.status === 400 &&
      JSON.stringify(failSubmitRes.data).includes('FSSAI');

    // Now upload the required FSSAI License:
    const uploadFssaiRes = await request(
      'POST',
      `/merchant/businesses/${testBusinessId}/documents`,
      {
        documentCategory: 'CATEGORY_LICENSE',
        documentType: 'FSSAI Food License',
        documentNumber: '13621000000123',
        fileDataUri: samplePdfBase64,
        fileName: 'fssai_license.pdf',
      },
      authHeaders
    );

    // Now submit KYC again:
    const passSubmitRes = await request(
      'POST',
      `/merchant/businesses/${testBusinessId}/kyc/submit`,
      {},
      authHeaders
    );

    const test8Pass = submitBlocked && (passSubmitRes.status === 200 || passSubmitRes.status === 201);
    recordResult(
      8,
      'Category-Specific Statutory License Enforcement',
      test8Pass,
      `Food business without FSSAI was strictly blocked (HTTP 400). Adding FSSAI license allowed submission.`
    );

    // ------------------------------------------------------------------------
    // TEST 9: Super Admin Approval, Rejection & Self-Approval Prevention
    // ------------------------------------------------------------------------
    // 9a: Prevent self-approval if admin header matches merchant user ID
    const selfApproveRes = await request(
      'POST',
      `/admin/businesses/${testBusinessId}/approve`,
      {},
      { 'x-admin-id': test1UserId }
    );
    const selfApprovalBlocked =
      selfApproveRes.status === 400 &&
      JSON.stringify(selfApproveRes.data).includes('Self-approval');

    // 9b: Super Admin rejects with remarks
    const rejectRes = await request(
      'POST',
      `/admin/businesses/${testBusinessId}/reject`,
      { reason: 'FSSAI document page 2 blur. Please re-upload clearer copy.' },
      { 'x-admin-id': 'super-admin-root' }
    );

    // Verify rejection status
    const bizAfterReject = await request('GET', '/merchant/businesses', null, authHeaders);
    const rejList = Array.isArray(bizAfterReject.data?.data) ? bizAfterReject.data.data : [];
    const rejStatus = (rejList.find(b => b.id === testBusinessId) || rejList[0])?.status;

    // 9c: Super Admin approves
    const approveRes = await request(
      'POST',
      `/admin/businesses/${testBusinessId}/approve`,
      {},
      { 'x-admin-id': 'super-admin-root' }
    );

    // Verify verified badge and status
    const bizAfterApprove = await request('GET', '/merchant/businesses', null, authHeaders);
    const appList = Array.isArray(bizAfterApprove.data?.data) ? bizAfterApprove.data.data : [];
    const appBiz = appList.find(b => b.id === testBusinessId) || appList[0];
    const isApproved = appBiz?.status === 'APPROVED' && (appBiz?.isVerified === true || appBiz?.isVerified === 1);

    const test9Pass =
      selfApprovalBlocked &&
      (rejectRes.status === 200 || rejectRes.status === 201) &&
      rejStatus === 'REJECTED' &&
      (approveRes.status === 200 || approveRes.status === 201) &&
      isApproved;

    recordResult(
      9,
      'Super Admin Workflow & Self-Approval Prevention',
      test9Pass,
      `Self-approval blocked. Rejection with remarks logged. Final approval granted verified badge.`
    );

    // ------------------------------------------------------------------------
    // TEST 10: Verified Document Deletion Protection
    // ------------------------------------------------------------------------
    // Now that business is approved and documents are VERIFIED,
    // merchant should be prevented from deleting verified regulatory documents
    const updatedDocsRes = await request(
      'GET',
      `/merchant/businesses/${testBusinessId}/documents`,
      null,
      authHeaders
    );
    const approvedDocs = Array.isArray(updatedDocsRes.data?.data)
      ? updatedDocsRes.data.data
      : (Array.isArray(updatedDocsRes.data) ? updatedDocsRes.data : []);
    const verifiedDoc = approvedDocs.find((d) => d.status === 'VERIFIED') || approvedDocs[0];

    let deleteBlocked = false;
    if (verifiedDoc) {
      const delRes = await request(
        'DELETE',
        `/merchant/businesses/${testBusinessId}/documents/${verifiedDoc.id}`,
        null,
        authHeaders
      );
      deleteBlocked = delRes.status === 400;
    }

    const test10Pass = deleteBlocked;
    recordResult(
      10,
      'Deletion Protection for Verified Statutory Documents',
      test10Pass,
      `Merchant attempt to delete a VERIFIED document returned HTTP 400 Bad Request.`
    );

  } catch (err) {
    console.error('Fatal execution error during acceptance suite:', err);
  }

  console.log('\n================================================================');
  console.log('ACCEPTANCE SUITE SUMMARY:');
  const allPassed = results.length === 10 && results.every((r) => r.passed);
  console.log(`TOTAL TESTS: ${results.length}/10`);
  console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
  console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL PASS ✅' : 'DEFECTS DETECTED ❌'}`);
  console.log('================================================================');
}

runAcceptanceSuite();
