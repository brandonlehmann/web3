import { ERC1155, Web3Controller } from '../src';

(async () => {
    const controller = await Web3Controller.load('Test App', {
        chainId: 250
    });

    {
        const token = new ERC1155(
            await controller.loadContract(
                '0x40ded8808a968e1067abb91e13c888c9a46ba099'));

        const max = await token.discoverMaximumId();

        console.log(max, max.toString());

        console.log(await token.balanceOfOwner('0xb2D555044CdE0a8A297F082f05ae6B1eFf663784'));
    }
})();
