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

    const superblock0Headers = [
        `000100306b42b36066c2b706b8d7f14a1ac62a2a9ca7ad405734c5ac569faa7bf5d56966e4a980215503d32f5be31f3060907d65d70f8c177b0afbf7e406aa4c4ca541ddbb47e75b8a9407180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5d03af62081a2f5669614254432f4d696e6564206279206166706c323031372f2cfabe6d6dccad01280afdd694b46dd1122d942465e3b5d8e304444c221739d63e6095352c040000000000000010062bd1076d8f34dab89a3da37e3a0000ffffffff0219cd324b000000001976a914536ffa992491508dca0354e52f32a3a7a679a53a88ac0000000000000000266a24aa21a9eddd6e172d9f8ebbccce0abb8330fcc6f4dcd15c8d8aab0de8b0f8fa36d1eab160000000005ed012ca783857904632f9a4ee0d2e0d755ee523660d8f0600000000000000000c0f158fdb86dea3b53f33c01364e55f6a73e1af9e58bb7c53af140a742c74d3be6aaee3e2df7f7741be946a434a866b0f1e5d028c3f5d996505710a7988447e478cf390257229007bc87895e0dd8587ff6dcc14ecffa64dcdc268d5c43ce9607dfe1c93e5074f0f567acc3424cb21781db8fa5cda4bbae679c1210c87702a025f08d809a75da6e51e6aea31f939b5fa2c443382f2a4ee399a91640a5d11ce54b2271e94190ce45a43127549e1601d0c62c644a542fac963f6ffe27685b1579e6da28e45e8e3e57620fa731d794c573b2c5506b61a92ac53f6d12b3e82ec17a18759ee929385842dbec22b77db55c41be9526b2e201b1ee880ad2951a449de3eb7f3d6fd1290c97c10ecedd5996da5e77f925964081ea0b41798a4e24d21ea9dde7b9b1be4d74497644420f92d6fcf3acb68d62b7d4a766b8f9c07f9fc252f6adbff99e0f04b6c4c1c34cd5c2873c93b89da2923bbaf9af45191d3b0b75bf00ef82783cd5e8221c72b8b88c0f3ed221f1d25f796e9d514276848239895a2a9abe00000000002258fd7b643ddfb1f235a68312e995a1f60878f111f87705fad3f53186f2d8690c141975a591c64ddbf034d56e671429187a0b9d4c9b48e30c9a5d1afc8701a9d0200000000004020be2bd5b042f797840282c36871b2d56d923747c36fd70e0000000000000000008963d64a88748976ad11529b8ee54cacd354c74d3a9cc974bd2d7dceece84246bb47e75b922d271748796f48`
    ];
    const superblock1Headers = [
        `00010030857c9e27ceda10a44f6c099311eade4e8c3ae34ad5286bceb9327301f9a046ef9a75dcf9c3ea7649b890620eaab617f5117722bed33045fb3953180e3c85d475c347e75b977d07180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5503af620841d6f9d1fde34c2341d6f9d1fcd20d1e2f4254432e544f502ffabe6d6d966a99fc30bb4931cdb397a063d151d04da6b8b268ba899a5231d34d8069f8638000000000000000b07f717fe956000000000000ffffffff021ae63d4b000000001976a914ba507bae8f1643d2556000ca26b9301b9069dc6b88ac0000000000000000266a24aa21a9ed9658ad08cd3492e6bf099da3bdf9a92529814612be49321be08191b9ff6059c50000000042cbbdd15acce2890546a94ab87a1575ea46256207c6f90400000000000000000cd3a04facfe8e0235b7a68fef8385234e5a144b00073ef92a40b1f46f186e069c73cc7a4eded41a64484b044589158df4757b4daa857016a52b0bd11cae107a4932cc90165c25a3e604b13f6a91acc6b6004db20367db92a0066f10b40df82d7b5a6d89e61988c7de0ed87c2754d20bdff0a2606db8b2e33b35ec5156e65f7a2d697fffecf7517c4eb7a9547c0f79e103077c76e356c858f9211b5f8bdf7cac8880b246cca152dac086413812c88194602f97d4d9102584eef9f7979169832bdec873c48c1a3fe811950df79935e9cd37c3b565e8ee8038d6e5b1d451047cf94ebb476c86adb17382632b3482f95f4e5adcf9198fe2abbff2c904fc0b90508f686dac8e99843ca51c1ea7dd511e9c54c1c9103cdb4a8eac39d11870b81e000d862f9297107f02e5decf96505638acf20bdb94ba72c4fe309b6bfb94e6941a34061ebc9d87ab81f57a667a7efad37a5e2de4c4e6e8f50b912972d316c237fa7f26874c335d5f1cad8a0e305fb2dcae9421a13ccd8f6794d5d994dd1dee99f1827b00000000070000000000000000000000000000000000000000000000000000000000000000e2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf97d24db2bfa41474bfb2f877d688fac5faa5e10a2808cf9de307370b93352e54894857d3e08918f70395d9206410fbfa942f1a889aa5ab8188ec33c2f6e207dc763be629fc31391eb1eff458b493fe949b80c5fc2f8d05e00504824bf4b0fcd80602aff15b0085cac536c039902b6bc10859567d850f4cf219e6a3f0a60142abb8e69168a8a3b35d975c29fcef9fdc03541c4a14c83b4339b1629048b44bd9b507e00000000008020be2bd5b042f797840282c36871b2d56d923747c36fd70e000000000000000000ff18451d0e763cd87abbcdf88687fd992a2296a32afe6b977f9a16ba257b804ef347e75b922d27172d3fe82b`,
        `00010030bdddd1f271065781e185c91e7623b0fad7577eb6ed48f4a6c084e7cd2b17bd77a954d9e9ce07055e9bf22a1dd44a9ab10bd8acc3d2e1487b3c66395c4eb775360348e75b52d206180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff6303af6208202f5669614254432f4d696e65642062792074616b61666a7a687339313430302f2cfabe6d6d8a376cac09279c1a3319b60b544138421fc3929a9b0950b6c51b8ebc0d9921b3040000000000000010b230ea034d65f67fedf1787aab280100ffffffff026c354a4b000000001976a914536ffa992491508dca0354e52f32a3a7a679a53a88ac0000000000000000266a24aa21a9ed26c2eacb8d3980e6d23a5aacbb09586b9de87c41239ca98697ac49a186951e2c00000000f22af76b72948efe5c2d5c50e9e2c453ce0280a787b0f30100000000000000000c0f158fdb86dea3b53f33c01364e55f6a73e1af9e58bb7c53af140a742c74d3be6aaee3e2df7f7741be946a434a866b0f1e5d028c3f5d996505710a7988447e478cf390257229007bc87895e0dd8587ff6dcc14ecffa64dcdc268d5c43ce9607d5bee975203a6594aecbaec0f094d8ff60b5a14fa3142903cdbb49ac39588b109b33f52d5d0db227fcf2dc2011f7e9825879fe20b2dc4e657c694a9c69691f8d8c977ed914778ac14d596b96d4eaf3f5cdcb6c408fb8c545c14091cc498772a6c16c582d56dfde16fc92838656e8feec2e20c806e25df8f205892d7f1c0635af97f3c6cdfd19e9e504abdf868697420864aa045c2dd265223d2164e253395226838a9630fc6e73ca2f8ae980d620448fa665567c25a08f66625af98e360c68ad42dfe9ff104246c1b4cc627db03af62a65fec2b5ba4bfc9be4f57c19e7710ab9aa1733d8ed777f3d334506c19c4887b78708e346a7f1da994220c7dfa501f5d0094e3a39d3dfab77b3dcda33e9f93a798fa51484e663080a8258d0afa16599afa00000000022f6fc81881813616333d1abb9b177166d02b206ba44f211e581fca95ed5211b9c9c22d0cab8999b06f64cfab27630008e872a07665c2da9d6884581e2f44ea6c0200000000000020be2bd5b042f797840282c36871b2d56d923747c36fd70e000000000000000000ec1e9a5aabb4b0924ce239c9a171e459d6e0ea0f7a5a6c9ed20aee4bdbb8fc933048e75b922d271734dc86d5`,
        `0001003017bdc440e07fd5ae01bb2ff10debc483ab85ad02ac88e65f413840aedf8fcdbdedc1435ccbeaa2fae080d3e1dfa1b73d3da1fdd06132c6b258c575eba7314d234648e75bd5ef06180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4b03b06208082f5669614254432f2cfabe6d6d70c6e6fbbeaa73fa5a3f7cf0e046f44692870d8c7af0f049cd6b41bc34b04a91040000000000000010b430e8038a649b415fc5ab8c2a000000ffffffff01807c814a000000001976a914536ffa992491508dca0354e52f32a3a7a679a53a88ac00000000100987dbd822a69bf22a7ce57b7cae82a17784b76229f40400000000000000000000000000022f6fc81881813616333d1abb9b177166d02b206ba44f211e581fca95ed5211b9c9c22d0cab8999b06f64cfab27630008e872a07665c2da9d6884581e2f44ea6c0200000000000020ea9d851c6acd55ac9b1b8ddc8cb383f981edd5db28e01500000000000000000002dfdafba9a66d74e45ff4af045f426b2a4bd83050ff4d2cbaf415056df6fdec6448e75b922d2717a469da88`
    ];
    const superblock2Headers = [
        `000100301e0c74e47b56541c05128090eb9aa326f1921b1c673cc0417a1a95e671e609a8179483e327e735a6a63d72831de78088c8830fe46aeec915a3103ca5601bd4266448e75bf28206180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff6403b062082cfabe6d6d32a99432ad7293104b6517d69232cc3eab6ab9dc4e35982a942c2b3dda07827608000000f09f909f000e4d696e656420627920626169796c000000000000000000000000000000000000000000000000000000000000000000000034afaaea034c88ad4a000000001976a914c825a1ecf2a6830c4401620c3a16f1995057c2ab88ac00000000000000002f6a24aa21a9edc68487fa8649197f918b49ea2da4d99752f893964c63301e6f8ba0bfea32283c08000000000000000000000000000000002c6a4c2952534b424c4f434b3a57320d9f7ea797df8947211a1eaf8166723a74ac59c6235d70e13a75f504c0acd1f96d41ab8856e57807730bcb9784da03b1052dd4133fe5d0941c0300000000000000000b67eb7081f19b98f5fe8a5da48d4eefbb5fe0f2a6dc01ccc1c0c21da823de6e003f1ed2fd7bb4d56444b5d8b9b053b5d525f50d21beacd651dadfe64b47d33dac0b42477a399373c5f14629effbc9897d3ead771b1d6c25a3410298d27c5b6d2249a5730ebfd3dd6e02e6489d5ee1e22e8e1eac40ad902d3e6308d6acca348dc23d43eb50ab8361f627ae55e6d5b0b27970391b4bae00bb9c3f2500c5628a204e87a98ce838fe7907ace6a0449d2c3edd8ae81b562fd65ce3211c30388b48042b45d7e5323f42855a82683e1c6abb6bac835df90ec9e6d9f883a50bb5aa1dd5f8efbd131b4f41cc4328319b1ca32e8d1c20f7fa20a1cb4d83be9cadabb5f30a35dc8cbaa04bc721ca85dafd986918fe8505db873e6e114e0f293591c0f7265cc72f7ae390e076311eda4b02418452bc7b5c9e9f01de05ba0f25454d2cb606c3519cc0e6339473e48df47ceadaf32eeff953017fb40dbeecec5f3789cd00a18d78000000000359aab394a33103dd85ed18dc99c53c0c77679fb6374311c06aff7e6598b695f177032806e674b9cc358f8a8f78759a4ca893c2c5500ccf28ebff54a47b40c2e5a056f60418e33c63b3b3e36b8184dcc8d354ffbbe00d29aabc74f65d9f9678190600000000000020ea9d851c6acd55ac9b1b8ddc8cb383f981edd5db28e015000000000000000000cdf574029bf1b8cef6996b5a8eea0625206023a0b6937505f553727866b4145fa148e75b922d2717978081a9`,
        `00010030ce2382e93c6df41a9378fa7dc841e7f8b9b46268f98afb5de5cdc1d9bcea3228395a8b90051ca6ceb5b5a7642e69a39f4d68ecbc34a7a6df6d6b724859f2d0e1a848e75b2b5a06180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff6403b062082cfabe6d6d8efa6cdcaf1478eeca38be416a4067a149fa2aa764ac12d30dbf8e4a9ff582a108000000f09f909f000e4d696e656420627920626a783034000000000000000000000000000000000000000000000000000000000000000000000038c906000297d5bc4a000000001976a914c825a1ecf2a6830c4401620c3a16f1995057c2ab88ac00000000000000002f6a24aa21a9ed2abe001bd2a8efe953639d29757e0b2105612fb179a1dfda1adbab5a390726b50800000000000000004976ab3aa1834bdc92d54a38cbe7098d8bd7bb53c1fabf0780e4e30500000000000000000b37a5cf72ed34bdf3a620ca1920389ea90b6144935fe5ee1dbe456a45b2b5744ca1f16f79cb9e5b6179fbac51b74fbaea6075166dbe0404330181954f4f4e680de2202aeb63bff729262e100193556f6b9e950098bfba6c5780cb117811a3de374cc715dd1cccfdd6f34da07e82204b24d82486fbfa5729bcc26d10a7dfb9636c89b0f1ffb3b7c804c1ed557a71ffe1a6dfdc30c14e22e1793755064b58377658e99043b67b2a11b7243a61a5e14ee3cac0eea5c49034d2f1de0a6015fb4c72de1121b200fb4fc52e2240000758bd61a885346b8af4ce90cb233777cb6c905c87908038f140398a07c7e3e2c4c9184930cc300b2e4c22f2c6d8fd6ad2a5a52e883475cc0f58553e90590c74b4b5d0139b9ff1f8bb0d73ce5cef137b1d95b94b74e95d30f8f23b99e7e10364c382d8036bd522f2bab8d8add0263c84f2a98c7af84a5679fd8bebc76eb88b0743a49f140f7d4cd3e58b5ccefdcab18b1c13964a2d0000000003070000000000000000000000000000000000000000000000000000000000000077032806e674b9cc358f8a8f78759a4ca893c2c5500ccf28ebff54a47b40c2e5a056f60418e33c63b3b3e36b8184dcc8d354ffbbe00d29aabc74f65d9f9678190600000000000020ea9d851c6acd55ac9b1b8ddc8cb383f981edd5db28e0150000000000000000006dc55bc890b3ee11f976c985287b3235551d4ed7605dce91c4086c6c00a7578ac948e75b922d271703812ec3`,
        `000100302d2654a165d4bfd5df36f440c510ecaf19aa6234fc8f5097d17565638ab65c3416b73f1926c611a0a5c4c1e37864e22a8cfe481c87fa4cb2086f26099bd2f056cf48e75b656f06180000000002000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4f03b0620804e148e75b2f44504f4f4c2e544f502f484e2ffabe6d6d27cde11e02e87a967064b7eb21b41b42e66c9d5650b0a4b53bd357925a05072501000000000000001774c7447064010000000000ffffffff024ba9c04a000000001976a91464d5c995b8897f8af38010ac654b78e6cc937ec288ac0000000000000000266a24aa21a9ed487aed9ce1e4550b6b14395bf03b4fdb875f16d210da7c569fec348bbaafbf5f000000000000000000000000045a709f73dd6b539cb5c911d359a6d997cda83561337b950b37a5cf72ed34bdf3a620ca1920389ea90b6144935fe5ee1dbe456a45b2b5744ca1f16f79cb9e5b6179fbac51b74fbaea6075166dbe0404330181954f4f4e680de2202aeb63bff729262e100193556f6b9e950098bfba6c5780cb117811a3de374cc715dd1cccfdd6f34da07e82204b24d82486fbfa5729bcc26d10a7dfb9636c3b9d13dbfbe65c257a7c41b13be3ac5b1a9c2a903f8b9e9b684149c1c80c7413fd30dddcc1f05bd92535259e8d8147c3ebbff02e0fce45ce86024466b05c57be611be9e14f7a8c0087e7987e431a3e58ab8e726578c2e9dbc0cca191f6c583821f280bd6a3e215b64550fe9418b1ed61516d370ed560c26698e9b66cfd3d29cbef0359f46bb0bf41ad73a05ab575b11af27df6ae33f275997d17959d41715afd339a89b5553b989cb9cccfa9b5d0ec546919103c7f7bf898c203572e5e98ee9e07ae9824dfdc630c6c592e594302b240c42e1e0380179e40cf4648438901ed8500000000000000000000000020ea9d851c6acd55ac9b1b8ddc8cb383f981edd5db28e0150000000000000000001e92555239bbb8e0049b88078a7ce000c2dfc36d540971d285c5b8592aaa1471e048e75b922d2717f36c0373`
    ];

    const superblock3Headers = [
        `000100302507055a9257d33bb5a4b050569d6ce6421bb421ebb76470967ae8021ee1cd2758f38f5638c4a156f507aad32862aa061cc38eee48eb11c5b5ce0775fc1da548fe48e75bba3d06180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5303b0620841d6f9d2474d1c2641d6f9d24689ca8b2f48756f62692ffabe6d6d037d93ac94d62a3ccb75bb8636927a151a372383681abc7113c1b02af131ba2d8000000000000000c70029c9e891020000000000ffffffff029020cb4a000000001976a91494155788e7233d7bea9aa29feb2ed37bc878c40b88ac0000000000000000266a24aa21a9ed2cc842f1f392f0bc0dfefedc0645bc18c64a341209ba738abfc55cd5aae00acc00000000c2543b6996667b2edafd38c0e1d9b1a71967ccd194bf160400000000000000000bef49f072b5f793026ffd572c9cdde39efc5b53e866728f4123350ef9b730fe7b59458952ce2d2bc42678221ae000cf6087ba0ea714db90af92514930f106c538bfd9d5b615b7401d1ebdae0e88685bb80d30792f100b0202e9a934b9c5ad35b9110b27347beeea25b496a2da8307ed2a0c85d957ce193c73bc27ed76f724baa5de32b507acfddb4ac972f1de1c8478134c1ff529d751edd046758e4775bacaf2ded829f0af2de99f2f4d5bbbee5506d69e43d2c7fe8bf9522f4701427bd231cd766f07577a7defb2936d4d039fa3b6556354f9b2ca6319fe4234afd3e17b211c75da9dfb9197ebcbc4f673ef603b76faee0f54f6ae4dcc62d5736ae369a78ee2c5585e60d45e054448e006093327b32806ffba26f765df3cc44d4e1652a5739dcf4a8ad4ba0ad6fb57054e448e4799653a7826f70a5f9ac7237454ba203fe1aa475e1d067635eb46a8bc133914e74e803ca2ff48596ff7cee4f843532a6ff9ba00000000070000000000000000000000000000000000000000000000000000000000000000e2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf97d24db2bfa41474bfb2f877d688fac5faa5e10a2808cf9de307370b93352e54894857d3e08918f70395d9206410fbfa942f1a889aa5ab8188ec33c2f6e207dc779c605137e44dead6811b4569ead0163dfeb44cd77dfb9c89e8523f4140f184675dd716746605a71598dfdbb86515f95f97ff0a64adc03b4171c37356b228442d672d807d43a16eef6664889342064a984b895553eb8c6be041f798a7c8b995a7e00000000000020ea9d851c6acd55ac9b1b8ddc8cb383f981edd5db28e0150000000000000000001dd644ccc7cbd335b113feffd67a511d2661e6a7ce2e756db3d2374ea1ab8add1a49e75b922d27172eb7db80`,
        `00010030da707eeedffe6dec4449d7fb3418e3ae0ab3cb740723032f66fb3edaadb986803dd2c9aa0f47b180cc2b597b841ecae2157c4591cc81e731ff8adea6108d6bf93149e75b884e06180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff6403b062082cfabe6d6dc40e26bf4093ed52420e0a6b16fe253f9c2c18edae6615d6487e4ff00c33da8a08000000f09f909f000e4d696e6564206279207a7a647a620000000000000000000000000000000000000000000000000000000000000000000000df5d6e36037d6cd34a000000001976a914c825a1ecf2a6830c4401620c3a16f1995057c2ab88ac00000000000000002f6a24aa21a9edcaaeddce27c130230fbe0972b8c33615b8d120fa588f95559738f6a8442e14b408000000000000000000000000000000002c6a4c2952534b424c4f434b3a22afe94046edca0beadb3ccb59024a4e4fba0fd2856efef0316e3bca56423f0901f81c3a7327ffed7ff06c9704df2f3774cc7194fc818f5be33b140100000000000000000b9fe30e6c7a849732c27a28df2c1d360c91572df61fa077c89df9a792b3635e2468ac88ee19b4145662219e2d056f2ea64c82039dc4e31255681b64bc1b83d4dc4092d16219f925ea3f6c85e472c8dc4ebf883e4d2301d6129cc4138f1d1e5b6eb17cf1dbaece3f1bcd277b0447f25809ed68d594527abb5ab8c759347e21e4b6e4e9736f084bb3f1a0a56567485ea0a8f696d5208bc7e790dc7952abf78cd4b6c76a11d71aa0927deb3165ab5627bdecbf42bf6ffd5fdc10063e7c2f15d85c97226a9f121f7253870bdf91720f9592a8ebe163aec871da225be9455072977a4f213ed821f7c569d45db3fc70e0e7548e9698f06361c6fda99902e45dccb8e5e4cd7a485f14b9d6261fa81cc4882e668c33bf07c85ac93c41533158fc1196fb9769982160200165739971c3c1045ce106f423fa0ccec6ad5967b0d5324e6b4cae6e638c35b79d7d7538be9d6e0b1228b812b185cbb5996c0cddb101dc456f46660000000003e72a3edda61437d02f00d459ba42200c22f4b70e281956066762bfd7e5ef42d777032806e674b9cc358f8a8f78759a4ca893c2c5500ccf28ebff54a47b40c2e5672f1bb56e43c7b5f9852b6203de59991e8a8f7a33490dba94579bdb83c298c00600000000000020ea9d851c6acd55ac9b1b8ddc8cb383f981edd5db28e015000000000000000000340cc9b6b222727424db3ef421e031dfeac1df948d65eac517df89f17fae3c894c49e75b922d27179b9ebf18`,
        `0001003034ba4fff32a514317882e599429bc79aa3d29001aa8bbdbae85e7b82866282c105aae4ffff9820c7b13bc609d0c0761f9725d8cc50673ab672ac674c4f65c9736749e75b7b2306180000000001000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5f03b062081c2f5669614254432f4d696e6564206279206b6972696c6c313938312f2cfabe6d6d5af9334af04c74d454f6b35da109812b99d9000a4da6967c0e3a955d6a8835ed04000000000000001085bc1f0ca3d242d42b6922ffeee50000ffffffff025875da4a000000001976a914536ffa992491508dca0354e52f32a3a7a679a53a88ac0000000000000000266a24aa21a9edb81adedc3c3c98177a38ef14a05d02416c1fffbf20f5e786abdf122b6ee05800000000002a3c6146562c671f094f72c8400f6cb0ea9e8c0e8ac2620400000000000000000c9fe30e6c7a849732c27a28df2c1d360c91572df61fa077c89df9a792b3635e2468ac88ee19b4145662219e2d056f2ea64c82039dc4e31255681b64bc1b83d4dc4092d16219f925ea3f6c85e472c8dc4ebf883e4d2301d6129cc4138f1d1e5b6e9431998bc6eb3c922a9ac5b3b3c9ba06eb2f5621b27561910ddc9623ad3ed3eb7c9e4fe00833b341b8aab8b9d52241499d0df1085619cb2eb8e141fd3dab7813beca7070b11600ff3de79b26b8cfd246729aac1efb6b46a916267b6ed123b765c9a573842edcb7c4a0940dafd650c6e3badb09fe01816db485b90c0101ece321fba3f27375126b301703b2ceeaf69b6ef8afcab39b4b983bf313d660bea922263e5690f8f63ce3e766112af54ebcb0c8d8a3a12a5457ee591b8b1da13d00cd85d5a545f279d02f9fa9181c6f071960cd4c989224e876ee3f94787f798af3ca0195ec22aee13e71856052e5404552548d6ac0c5d7737602c6983130dad0bdea1bac2c4db40ce4da852f93e53aeb6ebd0fd04ed7bccbc13c93f93fe5ab401acbe40000000002b1ff8d7ec0653960590f9e4eebad6ee638ec916b94475bc75bfce990a52e9f8d245b1bbc3ebf2656b83864ce2a8161c635dc6ecebadead7b0e6ca22cd32d9acf0200000000000020ea9d851c6acd55ac9b1b8ddc8cb383f981edd5db28e01500000000000000000032059833e7f354ccc1e00c257c71c970f5b0c850f29c7d3f2774a35d23f571fe6749e75b922d271716e01631`
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
    
    

    const superblock0 = utils.makeSuperblock(superblock0Headers, initParentId, 0);
    const superblock1 = utils.makeSuperblock(superblock1Headers, superblock0.superblockHash, superblock0.accumulatedWork);
    const superblock2 = utils.makeSuperblock(superblock2Headers, superblock1.superblockHash, superblock1.accumulatedWork);
    const superblock3 = utils.makeSuperblock(superblock3Headers, superblock2.superblockHash, superblock2.accumulatedWork);


    async function initSuperblockChain() {
        ({
            superblocks,
            claimManager,
            battleManager
        } = await utils.initSuperblockChain({
            network: utils.SYSCOIN_REGTEST,
            params: {
                ...utils.OPTIONS_SYSCOIN_REGTEST,
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
                superblock1.accumulatedWork.toString(),
                superblock1.timestamp,
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
        it('Query and verify hashes', async () => {

            result = await battleManager.methods.queryMerkleRootHashes(session1).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');
            

            result = await battleManager.methods.respondMerkleRootHashes(session1, superblock1Hashes).send({ from: submitter, gas: 300000 });
            assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');
        });




        // tests for 60 hashes, use only for gas profiling. Hashes are faked and validation fails down the road.
        // it('Propose superblock with 60 hashes', async () => {
        //     const result  = await claimManager.proposeSuperblock(
        //         superblock4.merkleRoot,
        //         superblock4.accumulatedWork,
        //         superblock4.timestamp,
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






        it('Query and reply block header', async () => {
            result = await battleManager.methods.queryLastBlockHeader(session1, -1).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.QueryLastBlockHeader, 'Query block header');

            result = await battleManager.methods.respondLastBlockHeader(session1, `0x${superblock1Headers[2]}`, "0x").send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.RespondLastBlockHeader, 'Respond last block header');
            
        });

        it('Verify superblock 1', async () => {
            result = await battleManager.methods.verifySuperblock(session1).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.ChallengerConvicted, 'Challenger not convicted despite fork being initially valid');
        });

        it('Semi-approve superblock 1', async () => {
            await utils.blockchainTimeoutSeconds(2 * utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
            result = await claimManager.methods.checkClaimFinished(superblock1Id).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.SuperblockClaimPending, 'Superblock challenged');
            const status = await superblocks.methods.getSuperblockStatus(superblock1Id).call();
            assert.equal(status, SEMI_APPROVED, 'Superblock was not semi-approved');
        });

        it('Propose superblock 2', async () => {
            const result  = await claimManager.methods.proposeSuperblock(
                superblock2.merkleRoot,
                superblock2.accumulatedWork.toString(),
                superblock2.timestamp,
                superblock2.lastHash,
                superblock2.lastBits,
                superblock2.parentId).send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
            superblock2Id = result.events.SuperblockClaimCreated.returnValues.superblockHash;
        });

        it('Semi-approve superblock 2', async () => {
            await utils.blockchainTimeoutSeconds(2 * utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
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
                superblock3.accumulatedWork.toString(),
                superblock3.timestamp,
                superblock3.lastHash,
                superblock3.lastBits,
                superblock3.parentId).send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
            superblock3Id = result.events.SuperblockClaimCreated.returnValues.superblockHash;
        });

        it('Semi-approve superblock 3', async () => {
            await utils.blockchainTimeoutSeconds(2 * utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
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
                superblock1.accumulatedWork.toString(),
                superblock1.timestamp,
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

        it('Query and verify hashes', async () => {

            result = await battleManager.methods.queryMerkleRootHashes(session1).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');

            result = await battleManager.methods.respondMerkleRootHashes(session1, superblock1Hashes).send({ from: submitter, gas: 300000 });
            assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');
        });

        it('Query and reply block header', async () => {

            result = await battleManager.methods.queryLastBlockHeader(session1, -1).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.QueryLastBlockHeader, 'Query block header');
  

            result = await battleManager.methods.respondLastBlockHeader(session1, `0x${superblock1Headers[2]}`, "0x").send({ from: submitter, gas: 300000 });
            assert.ok(result.events.RespondLastBlockHeader, 'Respond last block header');
            
        });

        it('Verify superblock 1', async () => {
            result = await battleManager.methods.verifySuperblock(session1).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.ChallengerConvicted, 'Challenger not convicted despite fork being initially valid');
        });

        it('Semi-approve superblock 1', async () => {
            await utils.blockchainTimeoutSeconds(2 * utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
            result = await claimManager.methods.checkClaimFinished(superblock1Id).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.SuperblockClaimPending, 'Superblock challenged');
            const status = await superblocks.methods.getSuperblockStatus(superblock1Id).call();
            assert.equal(status, SEMI_APPROVED, 'Superblock was not semi-approved');
        });

        it('Propose superblock 2', async () => {
            const result  = await claimManager.methods.proposeSuperblock(
                superblock2.merkleRoot,
                superblock2.accumulatedWork.toString(),
                superblock2.timestamp,
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

        it('Query and verify hashes', async () => {

            result = await battleManager.methods.queryMerkleRootHashes(session1).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.QueryMerkleRootHashes, 'Query merkle root hashes');

            result = await battleManager.methods.respondMerkleRootHashes(session1, superblock2Hashes).send({ from: submitter, gas: 300000 });
            assert.ok(result.events.RespondMerkleRootHashes, 'Respond merkle root hashes');
        });

        it('Query and reply block header', async () => {
            result = await battleManager.methods.queryLastBlockHeader(session1, -1).send({ from: challenger, gas: 2100000 });
            assert.ok(result.events.QueryLastBlockHeader, 'Query block header');

            result = await battleManager.methods.respondLastBlockHeader(session1, `0x${superblock2Headers[2]}`, "0x").send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.RespondLastBlockHeader, 'Respond last block header');
        });

        it('Verify superblock 2', async () => {
            result = await battleManager.methods.verifySuperblock(session1).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.ChallengerConvicted, 'Challenger not convicted despite fork being initially valid');
        });

        it('Semi-approve superblock 2', async () => {
            await utils.blockchainTimeoutSeconds(3 * utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
            result = await claimManager.methods.checkClaimFinished(superblock2Id).send({ from: challenger, gas: 300000 });
            assert.ok(result.events.SuperblockClaimPending, 'Superblock challenged');
            const status = await superblocks.methods.getSuperblockStatus(superblock2Id).call();
            assert.equal(status, SEMI_APPROVED, 'Superblock was not semi-approved');
        });

        it('Propose superblock 3', async () => {
            const result = await claimManager.methods.proposeSuperblock(
                superblock3.merkleRoot,
                superblock3.accumulatedWork.toString(),
                superblock3.timestamp,
                superblock3.lastHash,
                superblock3.lastBits,
                superblock3.parentId).send({ from: submitter, gas: 2100000 });
            assert.ok(result.events.SuperblockClaimCreated, 'New superblock proposed');
            superblock3Id = result.events.SuperblockClaimCreated.returnValues.superblockHash;
        });

        it('Semi-approve superblock 3', async () => {
            await utils.blockchainTimeoutSeconds(2 * utils.OPTIONS_SYSCOIN_REGTEST.TIMEOUT);
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
