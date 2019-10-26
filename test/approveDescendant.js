const utils = require('./utils');
const truffleAssert = require('truffle-assertions');
const SEMI_APPROVED = 3;
const APPROVED = 4;

contract('approveDescendant', (accounts) => {
    const owner = accounts[0];
    const submitter = accounts[1];
    const challenger = accounts[2];
    let claimManager;
    let superblocks;
    const initParentId = '0x0000000000000000000000000000000000000000000000000000000000000000';
    // 72001 - 0d08feb11a90703ad21d87f5fa3aea2f1014aeba2d1437fc0794b0e823957c98
    const superblock0Headers = [
        `0401001079cf7adb7e0785d004c5ade38afbd8098def81543d889d6505024c06b16484acf2e24c28c07bb0cdc41edb68725e5739cbd60bc3f7fefc5c286b4a03a4b5e6fd2fab315dc01f0b180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff640344f1082cfabe6d6d49759fd6053f6629bcbbc0891a7c9009db191113a443d3baaa21b05637d657d110000000f09f909f000d4d696e656420627920736367790000000000000000000000000000000000000000000000000000000000000500f88f00000000000004e2c3ca4d000000001976a914c825a1ecf2a6830c4401620c3a16f1995057c2ab88ac00000000000000002f6a24aa21a9ed198fa0075b4d1f46defe8daf734d91769a3879ac9614c03843335aad4e50722a08000000000000000000000000000000002c6a4c2952534b424c4f434b3a4a8e4a17e629fc2151679da1dcf2323fb92bb250a38e78e488fafe6c7f6808640000000000000000266a24b9e11b6dd0e119a8ee780db4d4211c6324e136333f23da6d941770f3a14115397471351659afd93900000000000000000000000000000000000000000000000000000000000000000cd1a68ca78273ffc7e98aa9368c4d9599ddc2dde12f6b078ca82d61ce692bb760972a7dc9acfa070bfd828506136121ed273d0c99fcb16f1acb6b3e4058f88cec53cf1b2e2b9216fe01976f33327932bcd3b94b0c7f250f3a3bd2564ea543442b201a0d9db0661df4fd18957b5b8a40769ed0d082d2c834dfa5b724bdbc9eb2213b819709ad28872ec06b9815d964c2ee8541da6736c970db6a67d917211c0a50a29c1f37af897c9cb2aaf9b4e1c1578b5716d022ee942843f3a6c83f4530c7287922c5e0152cef5da09c93dca64e8062dc9771ae8d82bacf6a189c5f7937572ed0757caa5de7ccbf2359be246e953a1f7a9ff5020a509389930eaf0dd560d654b21578a898242a57ed26a04d694c249f3ebf109f04a7adeddca942ef39435cc0c809443078985e690f5601a5eeb1d6fbffb27229dda083b84f9c014934ad4529384293f0183faca5402854a657933ec89203eb1b4a848aebc3afe457c1aebf165b3e9a60657589315d5c2ed3ce1871a3bc8e28338defb8386dc4c2c8a7dc92110000000004d3e642b5894a20e0bb95dd433c670d95868f1e77602a4a06d82ffbd3ca611e943feee5244c18afb612c4846a8bf1b07759fedbdec9d139ade9f4c82736e17fe8515781de95533de686107fd825918e6a24963594a526493c2c13d1c867b4c448d64f2fb3304c65bd16758dd1ef37ae2d3ef64c46690d9b23a9fbf484cb555d750e0000000000c0207f19065bbf8718c86acbe757b97145e0f59c5b1247a209000000000000000000e2f274bfd8129d3dabc41032bb3112b12882161f84293729918a9cc05362ee6552ab315d9b0d1f17252bef09`
    ];
    // 72002 - 582caa8e4657a2c7e875fed3cbd747ac774a19946dd21df1bc3e7cf860fba844
    const superblock1Headers = [
        `04010010987c9523e8b09407fc37142dbaae14102fea3afaf5871dd23a70901ab1fe080d7892ce50a793023a632e3430dbd2323d38a9b4d8e79da9337a06523a104471bc63ab315dc01f0b180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5a0344f108172f5669614254432f4d696e656420627920746f706d732f2cfabe6d6d798a3a7243c23a2fadf46faaf52821cbba66372de4c4d872dd2b9c36c130d226100000000000000010e26f830cd4901537583c74dc2e6a0000ffffffff02692bde4d000000001976a914536ffa992491508dca0354e52f32a3a7a679a53a88ac0000000000000000266a24aa21a9eda449c1b2504c4f05795f167860ac0340abead88f107067c4e6be566e35b47a030000000000000000000000000000000000000000000000000000000000000000000000000c6ff9fa8b17ae305bd8ace6cedac837ff412c5d6d2fa38355ff7aaef3f8d72835aa7b91b7de9e02e2b061bccf9e2062b57aac2179f3b947bad8397d4ed47fde88087e7ce90ae9e0f674797b7a447a329a138963f6c45b4f1871545974118406928703d44df4836926f49259ff2f4927118e0931ae6d6e9c54c6d3d449a4cb8843fa2945e08e32931d21e7a5df0ecaf0974f0a36ffdd63275ae19eaaee165798b2728da659912e6bff521b156cc8089a20eab7bc77f783d4e67aeb170b2dcfb31f57dd83da91839a2130fd5c660a70556b4a8d8791a29b9740c5ba518a6f49924d738e5283a81f0bab331840ba98d7fd2efe4c5f9d7764dc2619376d1c50fce341265ac37ec6abe20aa481fee0782feb0ef4e68144ea0fd3d80dd48d068cd403b17c36014a6c2a4b6286f1f4cd613b9635249285da0f934e55556df90a1b791a31abfbee4f95021dc7f95bfbf3cf7976a0517330ce849fbd1285f1b89a92d77d9902a0d17b68199a844e83ea9137d34039b6afa455045ff53e2238be69540f7ab000000000040000000000000000000000000000000000000000000000000000000000000000e2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf926afda83ce4a70dfee7dc9f30522882ea02c797a0027e7dcab44007dfe6700db9d1d462484bfbdcfe9df0801eb8942e2b5db7dcae9807c9aa088a7d7d00a928c0e000000000080207f19065bbf8718c86acbe757b97145e0f59c5b1247a209000000000000000000d1b45684b6dff1bd4497ae3385e4e38500a2b67880a448c9450867f1825ea06b90ab315d9b0d1f179173604a`,
        `0401001044a8fb60f87c3ebcf11dd26d94194a77ac47d7cbd3fe75e8c7a257468eaa2c58b1b12b42bb8f77277e15ff73ba2dd9c2886cc05a91df58e0fed9d952cd49f0e9a7ab315dc01f0b180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff640344f1082cfabe6d6d872be406ab76ffdbe646357e5dc4a4ae5144e3e299ead0d7e2c14fea89652a5a10000000f09f909f000e4d696e656420627920737a7364730000000000000000000000000000000000000000000000000000000000050082d700000000000004ed51f24d000000001976a914c825a1ecf2a6830c4401620c3a16f1995057c2ab88ac00000000000000002f6a24aa21a9ed214f3cd88e6f2c421f16b69b4b71fcebaac96012c692f26a85e8a976f702363108000000000000000000000000000000002c6a4c2952534b424c4f434b3af9f1f006b1ba1fec1af2a15435c334cd3f146ccd5105973262e30a9a09db1db40000000000000000266a24b9e11b6d70b5c9e26109e9de318234e7c1bea80c747d04bdd08dbc3729c2a8ef3a23d5b6452de73a00000000000000000000000000000000000000000000000000000000000000000cd1a68ca78273ffc7e98aa9368c4d9599ddc2dde12f6b078ca82d61ce692bb760c9dfd3ea63115ad179765363a1bd0ae30cf61e4abd85377125edef9223822df5381ae11c498aed32bf372298b3bed6be20d1a79f85433c2f612b697ad2d40e24b5595a09f0b34faf6065118ba2157638219ec85220497c44d8810f68492b18573ea4b3a7cd9f8ba86fc072137c0fd749ab9c354afa256e74d51161be4cf06c08e29542ed8e1678721eb73b205b82b0eaefe7dd9d49b2a6c8a435ae5a55e096e71a835f75bb855d88084d73775b1aefa89858d78e69e87aab7f5e2554292588934439eedf19dc190bc40641d6a144b7a9afb16d7c03b5983a626f081e87d7b23e36cd8d5743ee4ea73a206a38e31b5df9675b4218340f5300e0902d190ad67ad630c18a6ff1056a40e946473d757c7284aea60c8887baa534e6954ebd5fabc83a2afa5144de39d639c5fe2b5d3b93c59b075753763e84e0572e7a62ced17a55f3ab94522abac99ca42d23a7423f3f174be4c0052da880ab204d47b8a7b61f9bb300000000049aa8bf3bc6408966f235c9df4355384b540879364d545b76cfcceff192f635393feee5244c18afb612c4846a8bf1b07759fedbdec9d139ade9f4c82736e17fe8515781de95533de686107fd825918e6a24963594a526493c2c13d1c867b4c4487c8b7c7e52e4d4f7ed8542f22dcf7928e253dd6dafd78948caa854ae5569138f0e000000000000207f19065bbf8718c86acbe757b97145e0f59c5b1247a2090000000000000000005654d1a87d57d95b308dc165fa5a5a41ad20ed04c0ae08a129c6b5bb50b7531fb1ab315d9b0d1f17086200b0`,
        `04010010a3cc11bc300b2cc8d810ac4c88f174f533dd533e5ce98b24b9ad63d6ff59541aecd8121615912cc1190fec8a11f45bed3441ea0e653b5bc3fc9df250a93417b6bcab315dc01f0b180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5d0344f1081a2f5669614254432f4d696e6564206279206c6977656e3838382f2cfabe6d6d24d776a771b88d3e7be8eaa9ade37f975241887dfa8c50f7811f32b94cb33202100000000000000010406f4e04a924a9a9108d283d172c0000ffffffff02a43ef14d000000001976a914536ffa992491508dca0354e52f32a3a7a679a53a88ac0000000000000000266a24aa21a9edccfeba829dd37bbd8b30fec8f65d16f8bc6a40ba03c92a6761331735bde4085e0000000000000000000000000000000000000000000000000000000000000000000000000c6ff9fa8b17ae305bd8ace6cedac837ff412c5d6d2fa38355ff7aaef3f8d72835aa7b91b7de9e02e2b061bccf9e2062b57aac2179f3b947bad8397d4ed47fde88087e7ce90ae9e0f674797b7a447a329a138963f6c45b4f1871545974118406928703d44df4836926f49259ff2f4927118e0931ae6d6e9c54c6d3d449a4cb8843fa2945e08e32931d21e7a5df0ecaf0974f0a36ffdd63275ae19eaaee165798b2728da659912e6bff521b156cc8089a20eab7bc77f783d4e67aeb170b2dcfb31fa38279c8494f367ddf496b6e9028a7719e0e3f07eed6afb41a0353186c4341e85c9268e222f65a83352628c5e736ec9044a48b4f31f56f6f6101fdc08f15a7aca0758aba82a0659629eca254958a474a97977fb1922eeb6c901d064a3bdf4e8c29a9bc4d56fc0f1407a67567d0bbf131c4c26b7d5f38b0e38df61532623507d123fd776d792bad64d60d03feec4f5988b7d57c6d0744252e02628c5172b8af904e05bb4ac83172d4e6b135f0b89459a5afb0e0251c9589f36de61f3e08008c9600000000040000000000000000000000000000000000000000000000000000000000000000e2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9cc05624f2205c980deea3a65a31ec92af55a7810a1840b60a6d5f976f08848796140977113910a1f9aa83d894a4d96e700588c4da057485a613aaa344141fe750e000000000040207f19065bbf8718c86acbe757b97145e0f59c5b1247a2090000000000000000008b133da7a3dab712f354bf3ecb2904328f53b8922745cf52be6f0ff9fec8d645cdab315d9b0d1f17e4626891`
    ];
    // 72005 - 8181261134ab23952abf7c52dea32b0c642821a042f092df8378f201a03ea27c
    const superblock2Headers = [
        `0401001061dcdd01e0d3638865e61fd7be283c29727ecab03da190aed972f3f361d8e076c830cf92d16d44dc7dfb5ba86f3eb11cccdbfee5922fdc1739f3ef1de8d8af95d3ab315dc01f0b180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5f0344f1081c2f5669614254432f4d696e656420627920726f6d616e6f763131302f2cfabe6d6d097b38e1860dc20161d62c3a5183e6ce8ea71fbbd94d899dbafa2584a9a28c82100000000000000010e96f810cca1c8ffaa6c86d582b080100ffffffff025b1c164e000000001976a914536ffa992491508dca0354e52f32a3a7a679a53a88ac0000000000000000266a24aa21a9ed5136cac15741189c2fe25411aad81f81c289403ac4cf5fd47c77a5edb5b7e7e60000000000000000000000000000000000000000000000000000000000000000000000000c6ff9fa8b17ae305bd8ace6cedac837ff412c5d6d2fa38355ff7aaef3f8d72835aa7b91b7de9e02e2b061bccf9e2062b57aac2179f3b947bad8397d4ed47fde887b47b05cae443bd1de82e14c6f7f02022135ac838bc3c531cabf5d968ef0bb128703d44df4836926f49259ff2f4927118e0931ae6d6e9c54c6d3d449a4cb8843fa2945e08e32931d21e7a5df0ecaf0974f0a36ffdd63275ae19eaaee165798b2d81c73598b413da3a09e14011bae54f2db4aeead61aaa28badd56d1a43ef9040ecb057012b333f804db411f47ff1e0ec7f46ff56058120e56e5412aad428187d2cfed2d8cbc59c0d41300e10176a275630f24135030e3068492a062be927431ae2c7d88723d3e6b2e2beed2f56b67e068480eafa27678ccd1385fa212103ef9d0fe05107e2c92970fc930a81d2641dba584ea52e9f5ae6df73ab4230f1a4c6aa950125e8dedc6b37a7762d2dc89ff8b16d196eddf6054cbf44d7d2f228b045fd1a128b891d91b648e6e7b41e39c1d870cc974b39658a050baf4d75ee94d3564300000000040000000000000000000000000000000000000000000000000000000000000000e2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf926afda83ce4a70dfee7dc9f30522882ea02c797a0027e7dcab44007dfe6700db633d94cad7dff446b89f680966b1d717d4749f32ad9f6a207b0e2ebb4f608df90e000000000000207f19065bbf8718c86acbe757b97145e0f59c5b1247a2090000000000000000008b8966cb1ddb9b52beb98cf4c71a4bf4aae6ec9997dfff47466211eed59efe792dac315d9b0d1f17271e9b55`,
        `040100107ca23ea001f27883df92f042a02128640c2ba3de527cbf2a9523ab34112681816a15d6171367da087e3462c3d67bdb6fe25cea880c2d3f25e90da31c8bcf56f53eac315dc01f0b180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff640344f1082cfabe6d6de442cecdc382ff597d42b2055863a2c4383fe317783907679f6a2b22df38af2710000000f09f909f00114d696e65642062792061686d61646172610000000000000000000000000000000000000000000000000000050065e7000000000000048bae2d4e000000001976a914c825a1ecf2a6830c4401620c3a16f1995057c2ab88ac00000000000000002f6a24aa21a9ed1bab78cc0aec92549a32c5b0c121df53a9cd5f0f7f2588394d08de8651f753a908000000000000000000000000000000002c6a4c2952534b424c4f434b3a8d894fb4a934aec3884910831f80cc62c2af8be4c8dde3cb3044d79e91ec50740000000000000000266a24b9e11b6dac800db2c0164fb5891ecda6f7cb5406510eb77e52d452df22c1158719a3747494adc03d00000000000000000000000000000000000000000000000000000000000000000cd1a68ca78273ffc7e98aa9368c4d9599ddc2dde12f6b078ca82d61ce692bb760c9dfd3ea63115ad179765363a1bd0ae30cf61e4abd85377125edef9223822df5381ae11c498aed32bf372298b3bed6be20d1a79f85433c2f612b697ad2d40e242b9d30ee0fbfb7e47faffd7bd685f2182e7a60c350c59880e8c3534beeb2e5c8b0eec4a8a9976a8dab77ab359b72e0456e3e682cbf6c1114a63ba652ba949c1075b00a88f3108bfb9d1c133ea2420afc9eb817cda8f4ea769ff148a9c562b04a7d2639cf05d81cdaff6f46dfcc4856d2009494e5d480a8d3a2f5aa4e965104f5db120dd6e1293f5edb987603a5417e94e3cb56dc3341a5ef9e7a6d0bf03437c051ac6251cc1e3f1492fd2a737a1ac2d574c4733ffccac9805cc4c42f12aeb459fbff06e8a0380f22cba7669e259463fc6976267cd7061fe1c79e9751a5dd2b811ba3fb41a255e8e8e3d9cf26cd1add6d63599483e040739ddb5e3cae8ce328a0f845767c65fb931968241ee6683cfa168de97bafc82ad05c0ac34f67d8bbc12d000000000452ff66d6c1f0df1b474486dccc97bfe01873c7297327e66c997c157a713bed1e3feee5244c18afb612c4846a8bf1b07759fedbdec9d139ade9f4c82736e17fe8515781de95533de686107fd825918e6a24963594a526493c2c13d1c867b4c44829314fe06b5f4b5554518715b9e4ddaa9b1d34ff2c00a154f299b63b54bff89f0e000000000080207f19065bbf8718c86acbe757b97145e0f59c5b1247a2090000000000000000009e7f03467622c5994ae021e09b84ba9f9df95ed4a8c2c83b21b5337bc4ae826357ac315d9b0d1f17310b9149`,
        `040100109b79ce7134bb1dc03ac1d6f50f3b8cada1c47748064e81331c2fe00bf1ebe19c904c109c5abc49d9a8975b986b2b12b05f00996d4664f787194f37cdedc7fdab7dac315dc01f0b180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff590344f108162f5669614254432f4d696e65642062792073636d6c2f2cfabe6d6d8ff7dd27aae762b0f074d8ff847293fab659fc85014ec3254a70ab3ab5ec7652100000000000000010476fe8038a649b41723f609e048d2400ffffffff02df422c4e000000001976a914536ffa992491508dca0354e52f32a3a7a679a53a88ac0000000000000000266a24aa21a9edc289e9016733653093b6ff91d7a72a897f3b30d6853284fffb37b9a5afb40dc80000000000000000000000000000000000000000000000000000000000000000000000000c6ff9fa8b17ae305bd8ace6cedac837ff412c5d6d2fa38355ff7aaef3f8d72835aa7b91b7de9e02e2b061bccf9e2062b57aac2179f3b947bad8397d4ed47fde88669718c24e07a246b600489f65a409951aacf0c06c360ae96926ba76915fc231c789208e764e8eb42fa47e87fc0daea5f029ec97a31a9f31b050b9bf25c58253223ce351b3c013832d5307bb717d9209d2d56710d851f24dc148cd48ba1f0dd6312cf75088416666c1bdf5c441b492f3bb5dea17c9f2edd13667a3f7f80f4d2bf2d008c2adc220678065d25017b216a84f617d34baf2c03986945495c423b94fb698cad710a52f8bbc5485a85c72749b212dbc49af7567f7506081945367995e6b929d4364ac6875741ccf91ed89492f3e1c5fa2e9d8d445bfb5cc243b69ca8db32c203337699bd0ca47e4257cc9c7c4ca064c1b05476e4243986bfcf15c589915bc1b8a331c0e212e2180ec2625db79bf6bfa7324d8974f0666668e72bb60012bdd2bfe2d812aecbf195393955a99f97443d45486eaf400039470d3fd556ce800000000040000000000000000000000000000000000000000000000000000000000000000e2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9cc05624f2205c980deea3a65a31ec92af55a7810a1840b60a6d5f976f08848794c5a008f1ae1e220d285670b7082342cc1320830bdfbbcc749a7b20e01608cf70e000000000000207f19065bbf8718c86acbe757b97145e0f59c5b1247a20900000000000000000052a3215e14fbfe4344e1f42846d9ce77ba7b65b39edd3452897f06a5bd5d35f27dac315d9b0d1f17c973d1ee`
    ];
    // 72008 - f84b7d8a31a205f09f51c0268cdca2225aaef1b7f538d9fba9625d9f1ccd1f22
    const superblock3Headers = [
        `040100105a57484336a1ae0b2eeb15d7c654452ebaa65a0c646397cca1234b8c4ed1798a3782e656a0c933ac02f06483f7e3358e4de701a1cace26a150c5074aa03deadb8cac315dc01f0b180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff640344f1082cfabe6d6d79c31bc775648bb6b05d0ac8bf8a990476e3ff1faa16b052ddee24f517401ca810000000f09f909f00114d696e6564206279206c697a696a69616e00000000000000000000000000000000000000000000000000000500cce1010000000000046f58484e000000001976a914c825a1ecf2a6830c4401620c3a16f1995057c2ab88ac00000000000000002f6a24aa21a9ed68e1823f29a2d4242fd98643809edc7e17ad400f6522ed9086e38b175aaa211c08000000000000000000000000000000002c6a4c2952534b424c4f434b3ac32074831b5447a769277535a0f0f709f98fc8b5d58b5b3da06aeaa56f33bfc70000000000000000266a24b9e11b6d094ead8cdc9c9397cc10addd2a27f22a3660b956d43cb57187f93c04a10ee776d1d26c3a00000000000000000000000000000000000000000000000000000000000000000cd1a68ca78273ffc7e98aa9368c4d9599ddc2dde12f6b078ca82d61ce692bb760c9dfd3ea63115ad179765363a1bd0ae30cf61e4abd85377125edef9223822df5381ae11c498aed32bf372298b3bed6be20d1a79f85433c2f612b697ad2d40e242b9d30ee0fbfb7e47faffd7bd685f2182e7a60c350c59880e8c3534beeb2e5c8b0eec4a8a9976a8dab77ab359b72e0456e3e682cbf6c1114a63ba652ba949c10a5ede3eb204edf663c9d3f9e06a7b87fdab430fd5f64986d331efdee79755a255683921311deb9b4bc6e0c1b04408402477d1080461b04a029478fb0ffaced18fe8092d25dd739b2ab96d81e7b1118ca9a3661ca4bcbc19432339c79fe2bd6903c2c39c613504d78c5c788ed6f444c2352a88379cca4d71d3cf2173a979d9b795ee5daf9c0593e1ba07939db8da4747eca270ee2403178e87eae6a2a9b73b6a95a27bf7ce4b4cf2ae65aa94bd442de81ba0c6e24d6e5f02fab0b2365086b4abc1936facd39f7e8a2d4fbb77a22f6f5f56934c8a5c5dfe72d6446d0be9cfeed5e000000000435c02ecbd13585b109b56e07ca8e8a42a1d158a09d030ea5b673c81c3b88a6263feee5244c18afb612c4846a8bf1b07759fedbdec9d139ade9f4c82736e17fe8515781de95533de686107fd825918e6a24963594a526493c2c13d1c867b4c4480e62a87b6deda3a8ec633483f99cf78952f5888d9de365a6586109c81de8e7310e0000000000c0207f19065bbf8718c86acbe757b97145e0f59c5b1247a209000000000000000000f81a529532acbd47c230ab40197e6781e57e56444dca33295d1c86acd74375e9bdac315d9b0d1f17143cd597`,
        `04010010221fcd1c9f5d62a9fbd938f5b7f1ae5a22a2dc8c26c0519ff005a2318a7d4bf8b2778f2ac252aa5e9b22dda5421a1916a8ace80e7275142602f6b3e56c75c998d9ac315dc01f0b180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff640344f1082cfabe6d6d96372fe52757ebc5705aafe3bd820231c9e307092ecee0a2df89f6da3c82ce2210000000f09f909f00164d696e656420627920737a77777563616977616e31340000000000000000000000000000000000000000000500380b0a5d7690000004654a554e000000001976a914c825a1ecf2a6830c4401620c3a16f1995057c2ab88ac00000000000000002f6a24aa21a9ed4b28fa87f45d5982c95c6de8a217d3752dc86ad032648c893b07c62686f9573a08000000000000000000000000000000002c6a4c2952534b424c4f434b3a81e6f1178ee850d2feca2df8af9164efeb42ca612e1c1d0e8d4efba77eedb72c0000000000000000266a24b9e11b6d5b8bc2a2d113dbeda58a032b7ff75493d76280385f7ed1a2844026fa2c4f71628c68754900000000000000000000000000000000000000000000000000000000000000000cd1a68ca78273ffc7e98aa9368c4d9599ddc2dde12f6b078ca82d61ce692bb760c9dfd3ea63115ad179765363a1bd0ae30cf61e4abd85377125edef9223822df5381ae11c498aed32bf372298b3bed6be20d1a79f85433c2f612b697ad2d40e249cb298cf2de58547ca8c2c0b3832857d912dd078c411c7f0c1c13532a002c6def9e54907acf31ef543a36c2b6ebe1a2285d7581f424404a1727eb231e3eee5e763a9178ef84e18a38301ad62ae2578d9d4fb5ea419728c2b35c1ecb06e4714d40d9b45384c9d367bfcecf5c684ae87806d9c021077e38c73231a95c82279524b40d40de996da74878cf5cb32e7c0e8d1de8d59449d2c96cd3c688c22e699c127b86ef5b763dae5b7799454d26a38d172ae6be52decd4af5f303d078ddfe349cee4e8a2e1c10b44c1597aa127066c441b13f899c2b204ddcf123b427c400bf96bda26eef6c06af331eeb5ed99d1c1725223c60ba5c35a317e574283b4aef4f46099086cab0157136f47fcf40276aab4ec41f5ebf98f23092d4d7e671e8635a92b000000000436a395be4b7353a4c0477f3a11419db83fa54069207d83471b3242c3be28214f3feee5244c18afb612c4846a8bf1b07759fedbdec9d139ade9f4c82736e17fe8515781de95533de686107fd825918e6a24963594a526493c2c13d1c867b4c4484f9ae06ab9acda4927cd25793364175b0bc88433a818de860ca400d09ac847190e0000000000ff3f7f19065bbf8718c86acbe757b97145e0f59c5b1247a20900000000000000000007f83d3a10478eaa6909cef33aa7bfa6e7f128aaaff99f516680889b80693cf3edac315d9b0d1f178f45aa41`,
        `0401001009274a03e9a67c6575f998d0ae33b35dce372b2577ed56ac11d1392345d4b5c26d24469acd5c11ac222edb311c8dcc40dfc2e70de445ffe8f36799a08748d01fdeac315dc01f0b180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5d0344f1081a2f5669614254432f4d696e6564206279206175746f373331392f2cfabe6d6d21d4ac9598b77ee51693a57d60a3de7019a6a3a198543352051370d0258cd5ee100000000000000010f26f830cd490153757f36ddc021a0200ffffffff028542494e000000001976a914536ffa992491508dca0354e52f32a3a7a679a53a88ac0000000000000000266a24aa21a9ed3d137cbda1057b8106bf07490631a0f2c8eb90b3fcd74688c8bc1a8d927dfdc80000000000000000000000000000000000000000000000000000000000000000000000000c6ff9fa8b17ae305bd8ace6cedac837ff412c5d6d2fa38355ff7aaef3f8d72835aa7b91b7de9e02e2b061bccf9e2062b57aac2179f3b947bad8397d4ed47fde88669718c24e07a246b600489f65a409951aacf0c06c360ae96926ba76915fc231c789208e764e8eb42fa47e87fc0daea5f029ec97a31a9f31b050b9bf25c58253223ce351b3c013832d5307bb717d9209d2d56710d851f24dc148cd48ba1f0dd6312cf75088416666c1bdf5c441b492f3bb5dea17c9f2edd13667a3f7f80f4d2b4a157da9a68606e9d245d43d2ac25b57e1d81b2603b8d3ef9b715fcc2a923b16bda135d5b9c071df445816d7f7ff1db45c6983f8524b0793f4a361f6ce2dd9f90c672e0fd86585ad783069bf1d2a1314b42acd49879fc9d25ccfd0bea05a92dbd4759224b6f5ed29f6937ff2d0c19fadc3bbbe1e3c7e0f02a7539565b28b9a33401dd228fedc7beb35279b9ec596f5869e8d6929c52293d26da088661987fe7543a20ae2e69791c9b574d4ea3f06a0cbd7e16a5b348fbc92e7a4d01c676b047b00000000040000000000000000000000000000000000000000000000000000000000000000e2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf926afda83ce4a70dfee7dc9f30522882ea02c797a0027e7dcab44007dfe6700dbc800d6d307d1eb4b62a7db1a8437920520c48cfd578a75ce8cfe9580f11527600e000000000000207f19065bbf8718c86acbe757b97145e0f59c5b1247a20900000000000000000064605216721473607a476f3251a76c8c10def2a4a056f7b537cb23bc435471a3deac315d9b0d1f17f7153361`
    ];

    const superblock1Hashes = superblock1Headers.map(utils.calcBlockSha256Hash);
    const superblock2Hashes = superblock2Headers.map(utils.calcBlockSha256Hash);

    // use only for gas profiling
    // const superblock4Hashes = [
    //     '0x61e59a93fdc54eb347213908660d867f0c081144163e317adb6b04715bba04b6',
    //     '0x4912e067d38329fc4e4957cfcf6979ebdd12c88c5d01b9100316aa95705dc86d',
    //     '0xd281018c50c08e0b562847c745379e4186a90549fd213941400d9dddabb61d83',
    //     '0x2e2a8f87d7f7bb1dea98a73e0a29fdf3ca513c17abc2ddb35752330eab2f1b66',
    //     '0x2a2bce748c31d7f1494a7043f020de406241959d791eac5fe3c871837693f546',
    //     '0x63707bdf5b65a5914aaa24a7a8c76ba19e055f200f2428d91888ed65d2ce19da',
    //     '0x84e5916452b809c14609288493d401bca07c44628e295f5baffe385c0122fbd1',
    //     '0xe16eca7d2185ba2d1cb5a834a5a8f773a3ae147ede5a8dcc09ab2b7f172c07ac',
    //     '0x769f7d1bf5bba431afd5b4766b49ce1dde179d6b851b50ea7b2ec56178dea3b7',
    //     '0x4319021a392f192bb7f9277cb08db0a50ebcd590216147b4e1bfe53c99e6014f',

    //     '0x34e733ea765f106a3678bd410ef624212be56a0d07e04736c048e9630357d590',
    //     '0xb77794c9af67240cbab602bd2e6717aed3f247868c97503e2a1307f2be625530',
    //     '0xb985cfb6d71bb2dde02035fe382783b57ea6b996e6c41f0dc8fc7e0a55df6eb7',
    //     '0xdfe512d3197efe0a04aec29f4fad538c5c6ea4f85e61bf6c59dd4549b247d747',
    //     '0x32c479385cef67c21b788b2b5033b533af230560ed601da2c7ead5fb6c76f288',
    //     '0x6f27f5cc8f8b4390b3e4607412567e16cdc12c855f581123945fea80f4103376',
    //     '0x07cfb165b95bc38b4ef3d927930c87fa51980202f2ef01bd1fc932f00fcba2ed',
    //     '0x8c503c2bfb7a0e9a8b6e28071ea5791e4591a9a2fa94d34d1558c66481d04a31',
    //     '0xfa24e0c3d597eced9d4730be87d5f1e292d4562f98071a6f04adb9c25c3ce63c',
    //     '0xfe9ea9d39510888e5e1db260ea716c1950e19345de6e723e605dcf48ee3e9479',

    //     '0x16de6993280b3d99ece7447912c527c8ef689299ebb7a3b80a1c7093e766f83f',
    //     '0xf9315153f13ee0db95b40e5bc349d150d06b290cb85d59fb0396494def4ae534',
    //     '0x6b9133f2dc39edf963e6b106b10252b38229d239ea7a840f9daf3916473b77cf',
    //     '0x829fd4d8152bd01454c4ee179884a9cfb9bd3b44d7d10d1896022a4b2b4169fa',
    //     '0x761cd6aa6feb77df4616fb788cb4304ae003c7b0478f3e6fff20f8ac3c19f128',
    //     '0xc0687e550c3be07fd3151eadc82d9cf0f602e246220a1161305fdd8c813a14a7',
    //     '0xa9bd3c14e0469bf4db421b0ca2e44da18ee91b9d8466bdb2af934f1b9881f118',
    //     '0x3fe02bf92961c054224e42c11ae9852a4fea2255869cc034898c206e7ed50348',
    //     '0xb343c8b7bc80d14356fac3d5a9794dd70ad0bc992e0add6389c66aeb55477754',
    //     '0x3bee7e03ed7863badbc1d5b0eb4199a90cac14b475352b5ebe4988823bb59886',

    //     '0x665cfd159912a61776c262aa2eef2b28ab5c00b79ff112e81c9342589f7efcab',
    //     '0x29a8c2b9c1cffa1b5a067673a10c66031ae0e0bd68829dee8aef7e1bda91166b',
    //     '0x23d781dc2dff18bdafe9d484951e2eeabdc5e5f7e16d77928f67bda71b1cda1d',
    //     '0xde352bbaca48a2931248f9e200a9195bf6afb5e4bebbbcc9efc4c21f1d0f06b6',
    //     '0x79c7268847382538155049695dacfc1bb3209973d6c37eee4bc0c2794b83ff46',
    //     '0xabc4da6d66702cf4b65877c5e2204bbaf788e9d4f1093ae7a9c0b1a468627205',
    //     '0x6ef90ada55944d003c896ba9f9bd8f1fc6076b12f20dc8e4e15d3db14e767e3c',
    //     '0x9af1136c4654f37277719842e1f051b9572cd80f52e66b95ee5443c852568f1c',
    //     '0x18656b99e1e9057ca65480f1b5f7eb63a043b6f7594b5e5350881a4f1c88a8cd',
    //     '0x43654fe6b3d0c03b3606832030c97b96ff11774c869d411262ef954c48b10e37',

    //     '0x615918507856a3498b0797271aaa9107abb0502db55463082373e7b883f9f6c7',
    //     '0x1504d337d8286fceec8c88520c89b164a4ccb282e9d6792d0767180cbfbafe68',
    //     '0x9c17d7a3facc9288d4204239051107e616b08b681edb41711bf7aa1a1ce70a12',
    //     '0x80b5019a97b4fae3a5780d07f76cde7807faa92fdabaa9bcdb771e987edbf348',
    //     '0x3491db66960ff3fb40217b2287dd28902e77841552b2f6cd89aafce2746dbb2c',
    //     '0xa45a8b4e3a7775c88befab795d2779e9caa931244e680ac44bfce82c3f1ea758',
    //     '0x0445571dd33521971ee8c4b17910ba24c6f7a0883aa6d01e20f62626e6a76af0',
    //     '0x63d94803d76704cc8b49c7e40db42108011849089173c10cb6455dbd420c9e21',
    //     '0xcac1c6f5c6861eaf73c5fe0e8962fec57c9fc726e6d97a40c509476b8149fc28',
    //     '0xe5e8546fc7e1815ba4ec94e5be12c8dca792531fa5844d8b624bd5d7924a7da1',

    //     '0xcc41d468ddbcdbce7ecb0ed2ce657b50cdd1ccb1ae862170578f682a93feff07',
    //     '0x3b35788b2b7852daa187ec062215588bf2798c1848e038762501d13b083e36cf',
    //     '0x73bc3ed4c826f64e7ee7dbf0ad1f81efc220361de3396bcfbb1c5d051a4d9a9c',
    //     '0xda6eb4b02b1cc01ccf0b994c97797cc518a44d83709d552182ecb2fcd2e3da77',
    //     '0x22ecd5029771e854752d8cc4afc816785fdc7dfe0d2b69015a175e2f651a383b',
    //     '0x16e79f1177c2a1e306213b7ee360e0df6d20ddf1ce8335962b4744c3d0e49f0e',
    //     '0x41dbae5dfe056ebbc11294bc81cec24eb9afd3cbcd3005be2edbe5ab0bbd0783',
    //     '0x3cb3c8621fe533ec98b04f61bf8fc402bd35c4b5b438821990c2ab54fc11a4a4',
    //     '0xbcab13b5e109379b03a3ae0f8c475952f5bf002fee254dd5fec8eef82e8fdddf',
    //     '0x1c5793735acdc4804ab69e51b2dc2b667de98f239274de08a712e734cd91e1a0',

    // ]
    // const superblock4 = utils.makeSuperblockFromHashes(superblock4Hashes, initParentId, 0);
    
    

    const superblock0 = utils.makeSuperblock(superblock0Headers, initParentId);
    const superblock1 = utils.makeSuperblock(superblock1Headers, superblock0.superblockHash);
    const superblock2 = utils.makeSuperblock(superblock2Headers, superblock1.superblockHash);
    const superblock3 = utils.makeSuperblock(superblock3Headers, superblock2.superblockHash);


    async function initSuperblockChain() {
        ({
            superblocks,
            claimManager,
            battleManager
        } = await utils.initSuperblockChain({
            network: utils.SYSCOIN_REGTEST,
            params: {
                ...utils.SUPERBLOCK_OPTIONS_LOCAL,
                CONFIRMATIONS: 2,  // Superblocks required to confirm semi approved superblock,
            },
            genesisSuperblock: superblock0,
            from: owner,
        }));

        //FIXME: ganache-cli creates the same transaction hash if two accounts send the same amount
        await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD * 3, from: submitter, gas: 300000 });
        await claimManager.methods.makeDeposit().send({ value: utils.DEPOSITS.MIN_REWARD * 3, from: challenger, gas: 300000 });
    }

    describe('Approve two descendants', () => {
        let superblock0Id;
        let superblock1Id;
        let superblock2Id;
        let superblock3Id;
        let superblockR0Id;
        let superblock4Id;

        let session1;

        before(initSuperblockChain);

        it('Initialized', async () => {
            superblock0Id = superblock0.superblockHash;
            const best = await superblocks.methods.getBestSuperblock().call();
            assert.equal(superblock0Id, best, 'Best superblock should match');
        });

        // Propose initial superblock
        it('Propose superblock 1', async () => {
            const result  = await claimManager.methods.proposeSuperblock(
                superblock1.merkleRoot,
                superblock1.timestamp,
                superblock1.mtpTimestamp,
                superblock1.lastHash,
                superblock1.lastBits,
                superblock1.parentId).send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
            superblock1Id = result.events.SuperblockClaimCreated.returnValues.superblockHash;
        });

        it('Challenge superblock 1', async () => {
            const result = await claimManager.methods.challengeSuperblock(superblock1Id).send({ from: challenger, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
            assert.equal(superblock1Id, result.events.SuperblockClaimChallenged.returnValues.superblockHash);
            assert.ok(result.events.VerificationGameStarted, 'Battle started');
            session1 = result.events.VerificationGameStarted.returnValues.sessionId;
        });
        it('Try to rechallenge superblock 1', async () => {
            const result = await claimManager.methods.challengeSuperblock(superblock1Id).send({ from: challenger, gas: 2100000 });
            assert.ok(result.events.ErrorClaim, 'Challenger cannot re-challenge same superblock');
            
        });
        it('Verify headers', async () => {
            result = await battleManager.methods.respondBlockHeaders(session1, Buffer.from(superblock1Headers.join(""), 'hex'), superblock1Headers.length).send({ from: submitter, gas: 5000000 });
            assert.ok(result.events.ChallengerConvicted, 'Challenger not convicted despite fork being initially valid');
        });




        // tests for 60 hashes, use only for gas profiling. Hashes are faked and validation fails down the road.
        // it('Propose superblock with 60 hashes', async () => {
        //     const result  = await claimManager.proposeSuperblock(
        //         superblock4.merkleRoot,
        //         superblock4.timestamp,
        //         superblock4.mtpTimestamp,
        //         superblock4.lastHash,
        //         superblock4.lastBits,
        //         superblock4.parentId,
        //         { from: submitter },
        //     );
        //     utils.printGas(result, "proposeSuperblock 4");
        //     const superblockClaimCreatedEvent = utils.findEvent(result.logs, 'SuperblockClaimCreated');
        //     assert.ok(superblockClaimCreatedEvent, 'New superblock proposed');
        //     superblock4Id = superblockClaimCreatedEvent.args.superblockHash;
        // });
        // it('Challenge superblock with 60 hashes', async () => {
        //     const result = await claimManager.challengeSuperblock(superblock4Id, { from: challenger });
        //     utils.printGas(result, "challengeSuperblock 4");
        //     const superblockClaimChallengedEvent = utils.findEvent(result.logs, 'SuperblockClaimChallenged');
        //     assert.ok(superblockClaimChallengedEvent, 'Superblock challenged');
        //     assert.equal(superblock4Id, superblockClaimChallengedEvent.args.superblockHash);
        //     const verificationGameStartedEvent = utils.findEvent(result.logs, 'VerificationGameStarted');
        //     assert.ok(verificationGameStartedEvent, 'Battle started');
        //     session1 = verificationGameStartedEvent.args.sessionId;
        // });
        // it('Query and verify 60 hashes', async () => {

        //     result = await battleManager.queryMerkleRootHashes(session1, { from: challenger });
        //     utils.printGas(result, "queryMerkleRootHashes 4");
        //     assert.ok(utils.findEvent(result.logs, 'QueryMerkleRootHashes'), 'Query merkle root hashes');
            

        //     result = await battleManager.respondMerkleRootHashes(session1, superblock4Hashes, { from: submitter });
        //     utils.printGas(result, "respondMerkleRootHashes 4");
        //     assert.ok(utils.findEvent(result.logs, 'RespondMerkleRootHashes'), 'Respond merkle root hashes');
        // });




        it('Semi-approve superblock 1', async () => {
            await utils.blockchainTimeoutSeconds(2 * utils.SUPERBLOCK_OPTIONS_LOCAL.TIMEOUT);
            result = await claimManager.methods.checkClaimFinished(superblock1Id).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.SuperblockClaimPending, 'Superblock challenged');
            const status = await superblocks.methods.getSuperblockStatus(superblock1Id).call();
            assert.equal(status, SEMI_APPROVED, 'Superblock was not semi-approved');
        });

        it('Propose superblock 2', async () => {
            const result  = await claimManager.methods.proposeSuperblock(
                superblock2.merkleRoot,
                superblock2.timestamp,
                superblock2.mtpTimestamp,
                superblock2.lastHash,
                superblock2.lastBits,
                superblock2.parentId).send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
            superblock2Id = result.events.SuperblockClaimCreated.returnValues.superblockHash;
        });

        it('Semi-approve superblock 2', async () => {
            await utils.blockchainTimeoutSeconds(2 * utils.SUPERBLOCK_OPTIONS_LOCAL.TIMEOUT);
            result = await claimManager.methods.checkClaimFinished(superblock2Id).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.SuperblockClaimPending, 'Superblock challenged');
            const status = await superblocks.methods.getSuperblockStatus(superblock2Id).call();
            assert.equal(status, SEMI_APPROVED, 'Superblock was not semi-approved');
        });

        it('Missing confirmations', async () => {
            result = await claimManager.methods.confirmClaim(superblock1Id, superblock2Id).send({ from: submitter, gas: 300000 });
            assert.ok(result.events.ErrorClaim, 'No ErrorClaim event found');
        });

        it('Propose superblock 3', async () => {
            const result  = await claimManager.methods.proposeSuperblock(
                superblock3.merkleRoot,
                superblock3.timestamp,
                superblock3.mtpTimestamp,
                superblock3.lastHash,
                superblock3.lastBits,
                superblock3.parentId).send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
            superblock3Id = result.events.SuperblockClaimCreated.returnValues.superblockHash;
        });

        it('Semi-approve superblock 3', async () => {
            await utils.blockchainTimeoutSeconds(2 * utils.SUPERBLOCK_OPTIONS_LOCAL.TIMEOUT);
            result = await claimManager.methods.checkClaimFinished(superblock3Id).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.SuperblockClaimPending, 'Superblock challenged');
            const status = await superblocks.methods.getSuperblockStatus(superblock3Id).call();
            assert.equal(status, SEMI_APPROVED, 'Superblock was not semi-approved');
        });

        it('Approve both superblocks', async () => {
            result = await claimManager.methods.confirmClaim(superblock1Id, superblock3Id).send({ from: submitter, gas: 300000 });
            assert.equal(result.events.SuperblockClaimSuccessful.length, 3, 'SuperblockClaimSuccessful event missing');

            const status1 = await superblocks.methods.getSuperblockStatus(superblock1Id).call();
            const status2 = await superblocks.methods.getSuperblockStatus(superblock2Id).call();
            const status3 = await superblocks.methods.getSuperblockStatus(superblock3Id).call();
            assert.equal(status1, APPROVED, 'Superblock 1 was not approved');
            assert.equal(status2, APPROVED, 'Superblock 2 was not approved');
            assert.equal(status3, APPROVED, 'Superblock 3 was not approved');

            const bestSuperblock = await superblocks.methods.getBestSuperblock().call();
            assert.equal(bestSuperblock, superblock3Id, 'Bad best superblock');
        });
    });

    describe('Challenged descendant', () => {
        let superblock0Id;
        let superblock1Id;
        let superblock2Id;
        let superblock3Id;
        let superblockR0Id;

        let session1;

        before(initSuperblockChain);

        it('Initialized', async () => {
            superblock0Id = superblock0.superblockHash;
            const best = await superblocks.methods.getBestSuperblock().call();
            assert.equal(superblock0Id, best, 'Best superblock should match');
        });

        // Propose initial superblock
        it('Propose superblock 1', async () => {
            const result  = await claimManager.methods.proposeSuperblock(
                superblock1.merkleRoot,
                superblock1.timestamp,
                superblock1.mtpTimestamp,
                superblock1.lastHash,
                superblock1.lastBits,
                superblock1.parentId).send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
            superblock1Id = result.events.SuperblockClaimCreated.returnValues.superblockHash;
        });

        it('Challenge superblock 1', async () => {
            const result = await claimManager.methods.challengeSuperblock(superblock1Id).send({ from: challenger, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
            assert.equal(superblock1Id, result.events.SuperblockClaimChallenged.returnValues.superblockHash);
            assert.ok(result.events.VerificationGameStarted, 'Battle started');
            session1 = result.events.VerificationGameStarted.returnValues.sessionId;
        });

        it('Verify headers', async () => {
            result = await battleManager.methods.respondBlockHeaders(session1, Buffer.from(superblock1Headers.join(""), 'hex'), superblock1Headers.length).send({ from: submitter, gas: 5000000 });
            assert.ok(result.events.ChallengerConvicted, 'Challenger not convicted despite fork being initially valid');
        });
        

        it('Semi-approve superblock 1', async () => {
            await utils.blockchainTimeoutSeconds(2 * utils.SUPERBLOCK_OPTIONS_LOCAL.TIMEOUT);
            result = await claimManager.methods.checkClaimFinished(superblock1Id).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.SuperblockClaimPending, 'Superblock challenged');
            const status = await superblocks.methods.getSuperblockStatus(superblock1Id).call();
            assert.equal(status, SEMI_APPROVED, 'Superblock was not semi-approved');
        });

        it('Propose superblock 2', async () => {
            const result  = await claimManager.methods.proposeSuperblock(
                superblock2.merkleRoot,
                superblock2.timestamp,
                superblock2.mtpTimestamp,
                superblock2.lastHash,
                superblock2.lastBits,
                superblock2.parentId).send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
            superblock2Id = result.events.SuperblockClaimCreated.returnValues.superblockHash;
        });

        it('Challenge superblock 2', async () => {
            const result = await claimManager.methods.challengeSuperblock(superblock2Id).send({ from: challenger, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimChallenged, 'Superblock challenged');
            assert.equal(superblock2Id, result.events.SuperblockClaimChallenged.returnValues.superblockHash);
            assert.ok(result.events.VerificationGameStarted, 'Battle started');
            session1 = result.events.VerificationGameStarted.returnValues.sessionId;
        });

        it('Verify headers', async () => {
            result = await battleManager.methods.respondBlockHeaders(session1, Buffer.from(superblock2Headers.join(""), 'hex'), superblock2Headers.length).send({ from: submitter, gas: 5000000 });
            assert.ok(result.events.ChallengerConvicted, 'Challenger not convicted despite fork being initially valid');
        });

        it('Semi-approve superblock 2', async () => {
            await utils.blockchainTimeoutSeconds(3 * utils.SUPERBLOCK_OPTIONS_LOCAL.TIMEOUT);
            result = await claimManager.methods.checkClaimFinished(superblock2Id).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.SuperblockClaimPending, 'Superblock challenged');
            const status = await superblocks.methods.getSuperblockStatus(superblock2Id).call();
            assert.equal(status, SEMI_APPROVED, 'Superblock was not semi-approved');
        });

        it('Propose superblock 3', async () => {
            const result = await claimManager.methods.proposeSuperblock(
                superblock3.merkleRoot,
                superblock3.timestamp,
                superblock3.mtpTimestamp,
                superblock3.lastHash,
                superblock3.lastBits,
                superblock3.parentId).send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
            superblock3Id = result.events.SuperblockClaimCreated.returnValues.superblockHash;
        });

        it('Semi-approve superblock 3', async () => {
            await utils.blockchainTimeoutSeconds(2 * utils.SUPERBLOCK_OPTIONS_LOCAL.TIMEOUT);
            result = await claimManager.methods.checkClaimFinished(superblock3Id).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.SuperblockClaimPending, 'Superblock challenged');
            const status = await superblocks.methods.getSuperblockStatus(superblock3Id).call();
            assert.equal(status, SEMI_APPROVED, 'Superblock was not semi-approved');
        });

        it('Do not approve descendants because one of them was challenged', async () => {
            result = await claimManager.methods.confirmClaim(superblock1Id, superblock3Id).send({ from: submitter, gas: 300000 });
            assert.ok(result.events.SuperblockClaimSuccessful, 'SuperblockClaimSuccessful event missing');

            const status1 = await superblocks.methods.getSuperblockStatus(superblock1Id).call();
            const status2 = await superblocks.methods.getSuperblockStatus(superblock2Id).call();
            const status3 = await superblocks.methods.getSuperblockStatus(superblock3Id).call();
            assert.equal(status1, APPROVED, 'Superblock 1 was not approved');
            assert.equal(status2, SEMI_APPROVED, 'Superblock 2 status incorrect');
            assert.equal(status3, SEMI_APPROVED, 'Superblock 3 status incorrect');

            const bestSuperblock = await superblocks.methods.getBestSuperblock().call();
            assert.equal(bestSuperblock, superblock1Id, 'Bad best superblock');
        });
    });
});
