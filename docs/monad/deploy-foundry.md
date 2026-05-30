# Deploy & Verify on Monad with Foundry (recommended)

Foundry is the recommended toolchain. Full ERC20 walkthrough.

> Canonical source: https://docs.monad.xyz/guides/deploy-smart-contract/foundry
> and https://docs.monad.xyz/guides/verify-smart-contract/foundry (see `raw/llms-full.txt`).

## 1. Create project

```bash
forge init my-token
cd my-token
```

## 2. Configure `foundry.toml`

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
evm_version = "prague"      # REQUIRED on Monad
solc_version = "0.8.28"
```

## 3. Contract — `src/MyToken.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") {
        _mint(msg.sender, initialSupply);
    }
}
```

## 4. Install deps

```bash
forge install OpenZeppelin/openzeppelin-contracts
```

## 5. Deploy script — `script/Deploy.s.sol`

Use `forge script` (NOT `forge create`). Do NOT hardcode the address.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "forge-std/Script.sol";
import "../src/MyToken.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();                 // reads key from --private-key
        MyToken token = new MyToken(1_000_000 * 10**18);
        console.log("Token deployed at:", address(token));
        vm.stopBroadcast();
    }
}
```

## 6. Deploy

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## 7. Verify (all explorers in one call)

```bash
STANDARD_INPUT=$(forge verify-contract <TOKEN_ADDRESS> src/MyToken.sol:MyToken \
  --chain 10143 --show-standard-json-input)
COMPILER_VERSION=$(jq -r '.metadata | fromjson | .compiler.version' out/MyToken.sol/MyToken.json)

curl -X POST https://agents.devnads.com/v1/verify \
  -H "Content-Type: application/json" \
  -d "{
    \"chainId\": 10143,
    \"contractAddress\": \"<TOKEN_ADDRESS>\",
    \"contractName\": \"src/MyToken.sol:MyToken\",
    \"compilerVersion\": \"v${COMPILER_VERSION}\",
    \"standardJsonInput\": $STANDARD_INPUT,
    \"constructorArgs\": \"$(cast abi-encode 'constructor(uint256)' 1000000000000000000000000 | sed 's/0x//')\"
  }"
```

**Manual fallback (if the API fails):**

```bash
forge verify-contract <ADDR> <CONTRACT> --chain 10143 \
  --verifier sourcify \
  --verifier-url "https://sourcify-api-monad.blockvision.org/"
```
