const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const KEYSTORE_PATH = path.join(__dirname, '..', 'twa', 'android.keystore');
const ALIAS = 'android';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askPassword() {
  return new Promise((resolve) => {
    rl.question('Enter keystore password (same as bubblewrap build): ', (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  const password = await askPassword();
  rl.close();

  if (!fs.existsSync(KEYSTORE_PATH)) {
    console.error('\n❌ Keystore file NOT FOUND at:');
    console.error(KEYSTORE_PATH);
    console.error('\nMake sure bubblewrap init ran successfully and created the keystore.');
    process.exit(1);
  }

  const passArg = password ? `-storepass "${password}"` : '-storepass ""';
  let output;
  try {
    output = execSync(
      `keytool -list -v -keystore "${KEYSTORE_PATH}" -alias ${ALIAS} ${passArg}`,
      { encoding: 'utf-8', shell: true }
    );
  } catch (e) {
    console.error('\n❌ keytool failed. Full output:');
    console.error('stdout:', e.stdout || '(empty)');
    console.error('stderr:', e.stderr || '(empty)');
    console.error('message:', e.message);
    console.error('\nCommon causes:');
    console.error('1. Wrong password');
    console.error('2. keytool not in PATH (check JDK installation)');
    console.error('3. Corrupted keystore file');
    process.exit(1);
  }

  const match = output.match(/SHA256:\s*([A-F0-9:]+)/i);
  if (!match) {
    console.error('Could not extract SHA256 fingerprint from keystore output.');
    process.exit(1);
  }

  const fingerprint = match[1].replace(/:/g, '').toUpperCase();

  const assetlinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.gecx.app',
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ];

  const outputPath = path.join(__dirname, '..', 'public', '.well-known', 'assetlinks.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(assetlinks, null, 2));

  console.log('\n✅ Generated assetlinks.json with fingerprint:');
  console.log(fingerprint);
  console.log(`\n📁 Saved to: ${outputPath}`);
  console.log('\n🚀 Next: deploy your Next.js app so this file is live at:');
  console.log('   https://YOUR_DOMAIN/.well-known/assetlinks.json');
}

main();
