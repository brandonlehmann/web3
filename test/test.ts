import { ERC20, ERC721, Web3Controller } from '../src';

(async () => {
    const controller = await Web3Controller.load('Test App', {
        chainId: 250
    });

    {
        const token = new ERC20(
            await controller.loadContract(
                '0x6a31Aca4d2f7398F04d9B6ffae2D898d9A8e7938'));

        console.log(await token.tokenMetadata());
    }

    {
        const contract = await controller.loadContract('0x82a0ac751c118c7d4dee71fbb7436862d339e550');
        const nft = new ERC721(contract);
        console.log(await nft.royaltyInfo(1, Math.pow(10, 10)));

        console.log(await nft.ownedMetadata('0xb2D555044CdE0a8A297F082f05ae6B1eFf663784'));

        console.log(
            await nft.contract.call('royaltyInfo', 1, Math.pow(10, 10))
                .call('tokenURI', 1)
                .exec());

        console.log(await controller.multicall([
            nft.call('royaltyInfo', 1, Math.pow(10, 10)),
            nft.call('tokenURI', 1)
        ]));

        console.log(await nft.tokenMetadata());
    }
})();
