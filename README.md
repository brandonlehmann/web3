# Web3

## Installation

```bash
yarn add @brandonlehmann/web3
```

## Use

https://brandonlehmann.github.io/web3

### Example

```typescript
import { ERC20, Web3Controller } from '../src';

(async () => {
    const controller = await Web3Controller.load('Test App', {
        chainId: 250
    });
    
    const token = new ERC20(
        await controller.loadContract(
            '0x6a31Aca4d2f7398F04d9B6ffae2D898d9A8e7938'));

    console.log(await token.tokenMetadata());
})();
```
