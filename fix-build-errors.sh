#!/bin/bash

# Fix stores page errors
sed -i '121s/let voucherCount/const voucherCount/' src/app/admin/stores/\[id\]/page.tsx
sed -i '122s/let voucherTotal/const voucherTotal/' src/app/admin/stores/\[id\]/page.tsx
sed -i '134s/(m: any)/(m: { machineId: string; moneyIn: number; moneyOut: number })/' src/app/admin/stores/\[id\]/page.tsx

# Fix unused variables
find src -name "*.tsx" -type f -exec sed -i 's/} catch (err) {/} catch (_err) {/g' {} \;
find src -name "*.tsx" -type f -exec sed -i 's/const router = /const _router = /g' {} \;

echo "Fixed critical errors"
