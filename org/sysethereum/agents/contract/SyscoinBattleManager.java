package org.sysethereum.agents.contract;

import io.reactivex.Flowable;
import io.reactivex.functions.Function;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.DynamicBytes;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.RemoteCall;
import org.web3j.protocol.core.RemoteFunctionCall;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.BaseEventResponse;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.Contract;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;

/**
 * <p>Auto generated code.
 * <p><strong>Do not modify!</strong>
 * <p>Please use the <a href="https://docs.web3j.io/command_line.html">web3j command line tools</a>,
 * or the org.web3j.codegen.SolidityFunctionWrapperGenerator in the 
 * <a href="https://github.com/web3j/web3j/tree/master/codegen">codegen module</a> to update.
 *
 * <p>Generated with web3j version 4.5.4.
 */
@SuppressWarnings("rawtypes")
public class SyscoinBattleManager extends Contract {
    private static final String BINARY = "0x608060405234801561001057600080fd5b50612440806100206000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c8063795ea18e11610071578063795ea18e146101d8578063d1daeede146101f5578063df23ceb214610229578063e177321614610264578063f1afcfa614610281578063f871dfe814610289576100a9565b806318b011de146100ae5780633678c143146100c8578063455e6166146100f057806351fcf431146100f857806371a8c18a146101a7575b600080fd5b6100b66102a6565b60408051918252519081900360200190f35b6100ee600480360360208110156100de57600080fd5b50356001600160a01b03166102ac565b005b6100b6610303565b6100ee6004803603606081101561010e57600080fd5b8135919081019060408101602082013564010000000081111561013057600080fd5b82018360208201111561014257600080fd5b8035906020019184600183028401116401000000008311171561016457600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925061030f915050565b6101c4600480360360208110156101bd57600080fd5b503561075b565b604080519115158252519081900360200190f35b6100b6600480360360208110156101ee57600080fd5b503561077b565b6100ee6004803603606081101561020b57600080fd5b508035906001600160a01b03602082013581169160400135166107e4565b6100ee6004803603608081101561023f57600080fd5b5060ff813516906001600160a01b0360208201351690604081013590606001356108b6565b6101c46004803603602081101561027a57600080fd5b503561099f565b6100b66109bc565b6100b66004803603602081101561029f57600080fd5b50356109c2565b60355481565b60365461010090046001600160a01b03161580156102d257506001600160a01b03811615155b6102db57600080fd5b603680546001600160a01b0390921661010002610100600160a81b0319909216919091179055565b6729a2241af62c000081565b600083815260336020526040902080546001600160a01b031633811461033457600080fd5b6004820154600260365460ff16600281111561034c57fe5b146103845760028111158015610363575083601014155b8061037a575080600314801561037a575083600c14155b1561038457600080fd5b61038c61224c565b60375460408051636e5b707160e01b8152600481018a905290516001600160a01b0390921691636e5b70719160248082019261012092909190829003018186803b1580156103d957600080fd5b505afa1580156103ed573d6000803e3d6000fd5b505050506040513d61012081101561040457600080fd5b50805160208083015160408085015160608087015160808089015160a08a0151610100909a015163ffffffff90811660e08d0152918b019990995290971660c08901528781019690965286820152858301919091529184528151888152888202810190910190915260009190878015610487578160200160208202803883390190505b5090506060876040519080825280602002602001820160405280156104c657816020015b6104b3612296565b8152602001906001900390816104ab5790505b5090506000805b8251811015610609576104e08b86610a9e565b8382815181106104ec57fe5b6020026020010181905250600061051984838151811061050857fe5b602002602001015160000151610af3565b90506105258c87610b16565b1561059d576105326122bd565b61053c8d88610b39565b90508181600001511115610556576127a693505050610609565b600061057c86858151811061056757fe5b60200260200101516060015160001c83610c37565b905080600114610590579350610609915050565b50610140015195506105d1565b808483815181106105aa57fe5b60200260200101516060015160001c11156105ca57612792925050610609565b8560500195505b8382815181106105dd57fe5b6020026020010151606001518583815181106105f557fe5b6020908102919091010152506001016104cd565b50801561063957600188015461062c908c9089906001600160a01b031684610ca8565b5050505050505050610756565b610664888661064786610d7b565b8560018751038151811061065757fe5b6020026020010151611033565b9050801561068d576001880154610688908c9089906001600160a01b031684610ca8565b61074d565b42600289015561069e888684611199565b905080156106c257600188015461062c908c9089906001600160a01b031684610ca8565b88600c14806106e15750600260365460ff1660028111156106df57fe5b145b1561070257600188015461062c908c9089906001600160a01b03168461153a565b604080518c81526001880160208201526001600160a01b0389168183015290517fbb00dcdc614e6421b964f0ebca4d1ce96e2a575d555e09012e6f36ed405b410a9181900360600190a15b50505050505050505b505050565b60008181526033602052604090206035546002909101540142115b919050565b600081815260336020526040812080546001600160a01b031661079d57600080fd5b6035548160020154014211156107da57805460018201546107cf9185916001600160a01b03918216911661c36a610ca8565b61c36a915050610776565b5061c36e92915050565b60365461010090046001600160a01b031633811461080157600080fd5b600084815260336020526040902080546001600160a01b03161561082457600080fd5b80546001600160a01b038086166001600160a01b031992831617835560018301805491861691909216179055600061085f6004830182612317565b50426002820155604080518681526001600160a01b03808716602083015285168183015290517f3726b144f253954160bd0bb1f002a28f904f6e83596cbb62e9e1f2082644ca939181900360600190a15050505050565b600054610100900460ff16806108cf57506108cf611607565b806108dd575060005460ff16155b6109185760405162461bcd60e51b815260040180806020018281038252602e8152602001806123de602e913960400191505060405180910390fd5b600054610100900460ff16158015610943576000805460ff1961ff0019909116610100171660011790555b6036805486919060ff1916600183600281111561095c57fe5b0217905550603780546001600160a01b0319166001600160a01b038616179055603483905560358290558015610998576000805461ff00191690555b5050505050565b6000908152603360205260409020546001600160a01b0316151590565b60345481565b60006109cc61233b565b600083815260336020908152604091829020825160a08101845281546001600160a01b03908116825260018301541681840152600282015481850152600382015460608201526004820180548551818602810186019096528086529194929360808601939290830182828015610a6157602002820191906000526020600020905b815481526020019060010190808311610a4d575b5050509190925250508151919250506001600160a01b0316610a87576000915050610776565b505060009081526033602052604090206004015490565b610aa6612296565b610ab0838361160e565b63ffffffff168152610ac48383605061161d565b6060820152610ad383836116d8565b63ffffffff166040820152610ae883836116e7565b602082015292915050565b62ffffff8116630100000063ffffffff92831604909116600219016101000a0290565b6000610100610b258484611707565b1663ffffffff166000141590505b92915050565b610b416122bd565b60606000605084019350610b558585611743565b92509050610b66858580840361161d565b60208085019190915281019350610b7f8585600061176f565b60e08501919091529350610b958585602061181f565b61010084015260049390930192610bae8585600061176f565b60608501919091529350610bc48585602061181f565b608084015260049390930192610bdc8585605061161d565b835260249390930192610bef8585611861565b60c084015260289390930192610c078585602061181f565b610120840152600484016101408401526000610c2283611869565b60a08701525060408501525091949350505050565b6000816101000151600014610c4f575061274c610b33565b8160a00151600114610c66575060a0810151610b33565b8160400151610c758484611932565b14610c83575061277e610b33565b8160c00151610c9183611947565b14610c9f5750612788610b33565b50600192915050565b6036546040805163a4cbce7b60e01b8152600481018790526001600160a01b038581166024830152868116604483015291516101009093049091169163a4cbce7b9160648082019260009290919082900301818387803b158015610d0b57600080fd5b505af1158015610d1f573d6000803e3d6000fd5b505060408051878152602081018590526001600160a01b0387168183015290517fcc11926aca009e381b48e432fbfb8e3f192d5d8be733dc474fa78831bbfdf0449350908190036060019150a1610d7584611964565b50505050565b80516000906001811415610da65782600081518110610d9657fe5b6020026020010151915050610776565b60008111610df1576040805162461bcd60e51b81526020600482015260136024820152724d7573742070726f766964652068617368657360681b604482015290519081900360640190fd5b60005b81811015610e3d57610e1b848281518110610e0b57fe5b602002602001015160001c6119a9565b60001b848281518110610e2a57fe5b6020908102919091010152600101610df4565b6000805b6001841115611019575060009150815b8383101561101157838360010110610e6c5760018403610e71565b826001015b9150600280878581518110610e8257fe5b6020026020010151888581518110610e9657fe5b602002602001015160405160200180838152602001828152602001925050506040516020818303038152906040526040518082805190602001908083835b60208310610ef35780518252601f199092019160209182019101610ed4565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015610f32573d6000803e3d6000fd5b5050506040513d6020811015610f4757600080fd5b50516040805160208181019390935281518082038401815290820191829052805190928291908401908083835b60208310610f935780518252601f199092019160209182019101610f74565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015610fd2573d6000803e3d6000fd5b5050506040513d6020811015610fe757600080fd5b50518651879083908110610ff757fe5b602090810291909101015260029290920191600101610e51565b809350610e41565b61102986600081518110610e0b57fe5b9695505050505050565b6004840154600090600314806110595750600260365460ff16600281111561105757fe5b145b15611172576060600260365460ff16600281111561107357fe5b1415611080576001611083565b60045b60ff166040519080825280602002602001820160405280156110af578160200160208202803883390190505b50905060005b60048701548110156110fa578660040181815481106110d057fe5b90600052602060002001548282815181106110e757fe5b60209081029190910101526001016110b5565b8482828151811061110757fe5b60200260200101818152505061111c82610d7b565b86511461112f5761c37692505050611191565b836040015163ffffffff168660200151146111505761c37492505050611191565b856060015184606001511461116b5761c38b92505050611191565b505061118d565b60048501805460018101825560009182526020909120018390555b5060005b949350505050565b60006111a361224c565b6111ab612296565b836001855103815181106111bb57fe5b60200260200101519050603760009054906101000a90046001600160a01b03166001600160a01b0316636e5b707186608001516040518263ffffffff1660e01b8152600401808281526020019150506101206040518083038186803b15801561122357600080fd5b505afa158015611237573d6000803e3d6000fd5b505050506040513d61012081101561124e57600080fd5b5060408082015160608084015160809094015163ffffffff1660c087015285019290925283015260048601546001106112b05781606001518460008151811061129357fe5b602002602001015160200151146112b05761c38d92505050611533565b60006112c187868560c00151611ad3565b905080156112d3579250611533915050565b8451600c146112eb576060820151600388015561152b565b60006112f686611bf7565b9050866040015181146113115761c397945050505050611533565b8360400151811161132a5761c398945050505050611533565b600260365460ff16600281111561133d57fe5b1461152957600660018860e001510363ffffffff168161135957fe5b0663ffffffff16600014156114d757611370612296565b8660028851038151811061138057fe5b60209081029190910181015160375460e08b01516040805163c0dde98b60e01b815260051990920163ffffffff166004830152519294506001600160a01b0390911692632da8cffd92849263c0dde98b926024808301939192829003018186803b1580156113ed57600080fd5b505afa158015611401573d6000803e3d6000fd5b505050506040513d602081101561141757600080fd5b5051604080516001600160e01b031960e085901b1681526004810192909252516024808301926020929190829003018186803b15801561145657600080fd5b505afa15801561146a573d6000803e3d6000fd5b505050506040513d602081101561148057600080fd5b505160208901819052604082015160c08701516000926114a79263ffffffff160390611c5b565b90508063ffffffff168960c0015163ffffffff16146114d05761c3899650505050505050611533565b5050611500565b8360c0015163ffffffff168760c0015163ffffffff16146115005761c390945050505050611533565b826000015163ffffffff168760c0015163ffffffff16146115295761c390945050505050611533565b505b600093505050505b9392505050565b6036546040805163a4cbce7b60e01b8152600481018790526001600160a01b038681166024830152858116604483015291516101009093049091169163a4cbce7b9160648082019260009290919082900301818387803b15801561159d57600080fd5b505af11580156115b1573d6000803e3d6000fd5b505060408051878152602081018590526001600160a01b0386168183015290517fffa243eaeafd66e0a938ee0d270bbefd594e08a551dc29a9a44e39c719cfc79f9350908190036060019150a1610d7584611964565b303b155b90565b60006115338383604801611707565b6000611191600261162f868686611cb6565b604051602001808281526020019150506040516020818303038152906040526040518082805190602001908083835b6020831061167d5780518252601f19909201916020918201910161165e565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa1580156116bc573d6000803e3d6000fd5b5050506040513d60208110156116d157600080fd5b50516119a9565b60006115338383604401611707565b60248282010151600090600483016116fe826119a9565b95945050505050565b6000816020840101516040518160031a60008201538160021a60018201538160011a60028201538160001a60038201535160e01c949350505050565b600060606117548484600401611cdb565b90925090506117638483611d63565b60040194909350915050565b606060008060006117808787611db6565b9650915084158061179057508185115b1561179c57508061179f565b50835b6060816040519080825280602002602001820160405280156117cb578160200160208202803883390190505b50905060005b82811015611813576117eb6117e68a8a611861565b6119a9565b8282815181106117f757fe5b60209081029190910181019190915297909701966001016117d1565b50979596505050505050565b6000805b60088304811015611859578060080260020a858286018151811061184357fe5b016020015160f81c029190910190600101611823565b509392505050565b016020015190565b6000806000806000809050600063fabe6d6d60e01b905060006001600160e01b031990508751602089018181015b808210156118cc57848483511614156118c157856118ba57600482820384030196505b6001860195505b600182019150611897565b505050600283106118ee5750600095505050600319019150612760905061192b565b8260011415611918576119018885611861565b96505060031990920193506001925061192b915050565b5060009550505060031901915061276a90505b9193909250565b60006115338383608001518460600151611e68565b6000610b336117e683602001518461010001518560e00151611e68565b600081815260336020526040812080546001600160a01b031990811682556001820180549091169055600281018290556003810182905590610756600483018261237f565b60405160009060ff8316815382601e1a600182015382601d1a600282015382601c1a600382015382601b1a600482015382601a1a60058201538260191a60068201538260181a60078201538260171a60088201538260161a60098201538260151a600a8201538260141a600b8201538260131a600c8201538260121a600d8201538260111a600e8201538260101a600f82015382600f1a601082015382600e1a601182015382600d1a601282015382600c1a601382015382600b1a601482015382600a1a60158201538260091a60168201538260081a60178201538260071a60188201538260061a60198201538260051a601a8201538260041a601b8201538260031a601c8201538260021a601d8201538260011a601e8201538260001a601f8201535192915050565b8151600090600019015b8015611b8057611aeb612296565b848281518110611af757fe5b60200260200101519050611b09612296565b856001840381518110611b1857fe5b602002602001015190508551600c141580611b365750600186510383105b15611b5957815163ffffffff868116911614611b595761c38a9350505050611533565b8160200151816060015114611b755761c38c9350505050611533565b505060001901611add565b5082600081518110611b8e57fe5b60200260200101516000015163ffffffff168263ffffffff1614611bb5575061c38a611533565b6004840154600211611bed5782600081518110611bce57fe5b602002602001015160200151846003015414611bed575061c393611533565b5060009392505050565b6000611c016123a0565b60005b600b811015611c4757838160010181518110611c1c57fe5b60200260200101516040015163ffffffff168282600b8110611c3a57fe5b6020020152600101611c04565b50611c5181612082565b60a0015192915050565b600082614380811015611c715750614380611c80565b616978811115611c8057506169785b6000611c8b84610af3565b6154609083020490506001600160ec1b03811115611cad57506001600160ec1b035b6116fe81612124565b60006040516020818486602089010160025afa611cd257600080fd5b51949350505050565b60006060600080611cec8686611db6565b9550915081611d1c57611cff8686611db6565b9550915081611d0d57600080fd5b611d178686611db6565b955091505b81600114611d2957600080fd5b602485019450611d398686611db6565b955090506060611d4c87878481016121b5565b9590910160040194859450925050505b9250929050565b6000806000611d728585611db6565b94509150600a8210611d8357600080fd5b60005b82811015611dac57600885019450611d9e8686611db6565b810195509150600101611d86565b5092949350505050565b6000806000848481518110611dc757fe5b01602001516001949094019360f81c905060fd811015611dee5760ff169150829050611d5c565b8060ff1660fd1415611e1457611e068585601061181f565b846002019250925050611d5c565b8060ff1660fe1415611e3a57611e2c8585602061181f565b846004019250925050611d5c565b8060ff1660ff1415611e6057611e528585604061181f565b846008019250925050611d5c565b509250929050565b8051600090815b81811015611eb257611e93848281518110611e8657fe5b60200260200101516119a9565b848281518110611e9f57fe5b6020908102919091010152600101611e6f565b50600080611ebf876119a9565b90505b8282101561206e576000858381518110611ed857fe5b6020026020010151905060008060028981611eef57fe5b0660011415611f02575081905082611f08565b50829050815b600280838360405160200180838152602001828152602001925050506040516020818303038152906040526040518082805190602001908083835b60208310611f625780518252601f199092019160209182019101611f43565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015611fa1573d6000803e3d6000fd5b5050506040513d6020811015611fb657600080fd5b50516040805160208181019390935281518082038401815290820191829052805190928291908401908083835b602083106120025780518252601f199092019160209182019101611fe3565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015612041573d6000803e3d6000fd5b5050506040513d602081101561205657600080fd5b50519350600289049850600185019450505050611ec2565b612077816119a9565b979650505050505050565b60005b600b81101561212057600181015b600b811015612117578281600b81106120a857fe5b60200201518383600b81106120b957fe5b6020020151111561210f5760008383600b81106120d257fe5b602002015190508382600b81106120e557fe5b60200201518484600b81106120f657fe5b6020020152808483600b811061210857fe5b6020020152505b600101612093565b50600101612085565b5050565b60008061213d61213384612207565b600701600361222f565b90506000600382116121655761215e8462ffffff1683600303600802612245565b905061217d565b612175846003840360080261222f565b62ffffff1690505b628000008116156121a2576121998163ffffffff16600861222f565b90506001820191505b6121ad826018612245565b179392505050565b6060600083830390506060816040519080825280601f01601f1916602001820160405280156121eb576020820181803883390190505b5090508160208201838760208a010160045afa6116fe57600080fd5b6000815b80156122295761221c81600161222f565b905060018201915061220b565b50919050565b60008160020a838161223d57fe5b049392505050565b60020a0290565b6040805161012081018252600080825260208201819052918101829052606081018290526080810182905260a0810182905260c0810182905260e081018290529061010082015290565b60408051608081018252600080825260208201819052918101829052606081019190915290565b60405180610160016040528060008152602001600081526020016000815260200160608152602001600081526020016000815260200160008152602001606081526020016000815260200160008152602001600081525090565b815481835581811115610756576000838152602090206107569181019083016123bf565b6040518060a0016040528060006001600160a01b0316815260200160006001600160a01b031681526020016000815260200160008019168152602001606081525090565b508054600082559060005260206000209081019061239d91906123bf565b50565b604051806101600160405280600b906020820280388339509192915050565b61160b91905b808211156123d957600081556001016123c5565b509056fe436f6e747261637420696e7374616e63652068617320616c7265616479206265656e20696e697469616c697a6564a265627a7a723158202c3695d2da6f4d5b62215d86a3dda6b359b6ba0682cc88a0f0dfbadbe4a24ba064736f6c634300050c0032";

    public static final String FUNC_MINPROPOSALDEPOSIT = "minProposalDeposit";

    public static final String FUNC_SUPERBLOCKDURATION = "superblockDuration";

    public static final String FUNC_SUPERBLOCKTIMEOUT = "superblockTimeout";

    public static final String FUNC_INIT = "init";

    public static final String FUNC_SETSYSCOINCLAIMMANAGER = "setSyscoinClaimManager";

    public static final String FUNC_BEGINBATTLESESSION = "beginBattleSession";

    public static final String FUNC_RESPONDBLOCKHEADERS = "respondBlockHeaders";

    public static final String FUNC_TIMEOUT = "timeout";

    public static final String FUNC_GETSUBMITTERHITTIMEOUT = "getSubmitterHitTimeout";

    public static final String FUNC_GETNUMMERKLEHASHESBYSESSION = "getNumMerkleHashesBySession";

    public static final String FUNC_SESSIONEXISTS = "sessionExists";

    public static final Event CHALLENGERCONVICTED_EVENT = new Event("ChallengerConvicted", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event NEWBATTLE_EVENT = new Event("NewBattle", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Address>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event RESPONDBLOCKHEADERS_EVENT = new Event("RespondBlockHeaders", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event SUBMITTERCONVICTED_EVENT = new Event("SubmitterConvicted", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}, new TypeReference<Address>() {}));
    ;

    protected static final HashMap<String, String> _addresses;

    static {
        _addresses = new HashMap<String, String>();
        _addresses.put("4", "0x0ACc9716e5aaC465a4717D4c7Fd2502476488134");
    }

    @Deprecated
    protected SyscoinBattleManager(String contractAddress, Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    protected SyscoinBattleManager(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, credentials, contractGasProvider);
    }

    @Deprecated
    protected SyscoinBattleManager(String contractAddress, Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    protected SyscoinBattleManager(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public List<ChallengerConvictedEventResponse> getChallengerConvictedEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(CHALLENGERCONVICTED_EVENT, transactionReceipt);
        ArrayList<ChallengerConvictedEventResponse> responses = new ArrayList<ChallengerConvictedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            ChallengerConvictedEventResponse typedResponse = new ChallengerConvictedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(1);
            typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(2);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<ChallengerConvictedEventResponse> challengerConvictedEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, ChallengerConvictedEventResponse>() {
            @Override
            public ChallengerConvictedEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(CHALLENGERCONVICTED_EVENT, log);
                ChallengerConvictedEventResponse typedResponse = new ChallengerConvictedEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(1);
                typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(2);
                return typedResponse;
            }
        });
    }

    public Flowable<ChallengerConvictedEventResponse> challengerConvictedEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(CHALLENGERCONVICTED_EVENT));
        return challengerConvictedEventFlowable(filter);
    }

    public List<NewBattleEventResponse> getNewBattleEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(NEWBATTLE_EVENT, transactionReceipt);
        ArrayList<NewBattleEventResponse> responses = new ArrayList<NewBattleEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            NewBattleEventResponse typedResponse = new NewBattleEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(1);
            typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(2);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<NewBattleEventResponse> newBattleEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, NewBattleEventResponse>() {
            @Override
            public NewBattleEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(NEWBATTLE_EVENT, log);
                NewBattleEventResponse typedResponse = new NewBattleEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(1);
                typedResponse.challenger = (Address) eventValues.getNonIndexedValues().get(2);
                return typedResponse;
            }
        });
    }

    public Flowable<NewBattleEventResponse> newBattleEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(NEWBATTLE_EVENT));
        return newBattleEventFlowable(filter);
    }

    public List<RespondBlockHeadersEventResponse> getRespondBlockHeadersEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(RESPONDBLOCKHEADERS_EVENT, transactionReceipt);
        ArrayList<RespondBlockHeadersEventResponse> responses = new ArrayList<RespondBlockHeadersEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            RespondBlockHeadersEventResponse typedResponse = new RespondBlockHeadersEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.merkleHashCount = (Uint256) eventValues.getNonIndexedValues().get(1);
            typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(2);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<RespondBlockHeadersEventResponse> respondBlockHeadersEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, RespondBlockHeadersEventResponse>() {
            @Override
            public RespondBlockHeadersEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(RESPONDBLOCKHEADERS_EVENT, log);
                RespondBlockHeadersEventResponse typedResponse = new RespondBlockHeadersEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.merkleHashCount = (Uint256) eventValues.getNonIndexedValues().get(1);
                typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(2);
                return typedResponse;
            }
        });
    }

    public Flowable<RespondBlockHeadersEventResponse> respondBlockHeadersEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(RESPONDBLOCKHEADERS_EVENT));
        return respondBlockHeadersEventFlowable(filter);
    }

    public List<SubmitterConvictedEventResponse> getSubmitterConvictedEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(SUBMITTERCONVICTED_EVENT, transactionReceipt);
        ArrayList<SubmitterConvictedEventResponse> responses = new ArrayList<SubmitterConvictedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            SubmitterConvictedEventResponse typedResponse = new SubmitterConvictedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(1);
            typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(2);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<SubmitterConvictedEventResponse> submitterConvictedEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, SubmitterConvictedEventResponse>() {
            @Override
            public SubmitterConvictedEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(SUBMITTERCONVICTED_EVENT, log);
                SubmitterConvictedEventResponse typedResponse = new SubmitterConvictedEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(1);
                typedResponse.submitter = (Address) eventValues.getNonIndexedValues().get(2);
                return typedResponse;
            }
        });
    }

    public Flowable<SubmitterConvictedEventResponse> submitterConvictedEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(SUBMITTERCONVICTED_EVENT));
        return submitterConvictedEventFlowable(filter);
    }

    public RemoteFunctionCall<Uint256> minProposalDeposit() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_MINPROPOSALDEPOSIT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint256> superblockDuration() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_SUPERBLOCKDURATION, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint256> superblockTimeout() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_SUPERBLOCKTIMEOUT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<TransactionReceipt> init(Uint8 _network, Address _superblocks, Uint256 _superblockDuration, Uint256 _superblockTimeout) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_INIT, 
                Arrays.<Type>asList(_network, _superblocks, _superblockDuration, _superblockTimeout), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> setSyscoinClaimManager(Address _syscoinClaimManager) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_SETSYSCOINCLAIMMANAGER, 
                Arrays.<Type>asList(_syscoinClaimManager), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> beginBattleSession(Bytes32 superblockHash, Address submitter, Address challenger) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_BEGINBATTLESESSION, 
                Arrays.<Type>asList(superblockHash, submitter, challenger), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> respondBlockHeaders(Bytes32 superblockHash, DynamicBytes blockHeaders, Uint256 numHeaders) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_RESPONDBLOCKHEADERS, 
                Arrays.<Type>asList(superblockHash, blockHeaders, numHeaders), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> timeout(Bytes32 superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_TIMEOUT, 
                Arrays.<Type>asList(superblockHash), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<Bool> getSubmitterHitTimeout(Bytes32 superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETSUBMITTERHITTIMEOUT, 
                Arrays.<Type>asList(superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint256> getNumMerkleHashesBySession(Bytes32 superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETNUMMERKLEHASHESBYSESSION, 
                Arrays.<Type>asList(superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Bool> sessionExists(Bytes32 superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_SESSIONEXISTS, 
                Arrays.<Type>asList(superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    @Deprecated
    public static SyscoinBattleManager load(String contractAddress, Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        return new SyscoinBattleManager(contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    @Deprecated
    public static SyscoinBattleManager load(String contractAddress, Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        return new SyscoinBattleManager(contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    public static SyscoinBattleManager load(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        return new SyscoinBattleManager(contractAddress, web3j, credentials, contractGasProvider);
    }

    public static SyscoinBattleManager load(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        return new SyscoinBattleManager(contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static RemoteCall<SyscoinBattleManager> deploy(Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        return deployRemoteCall(SyscoinBattleManager.class, web3j, credentials, contractGasProvider, BINARY, "");
    }

    @Deprecated
    public static RemoteCall<SyscoinBattleManager> deploy(Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        return deployRemoteCall(SyscoinBattleManager.class, web3j, credentials, gasPrice, gasLimit, BINARY, "");
    }

    public static RemoteCall<SyscoinBattleManager> deploy(Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        return deployRemoteCall(SyscoinBattleManager.class, web3j, transactionManager, contractGasProvider, BINARY, "");
    }

    @Deprecated
    public static RemoteCall<SyscoinBattleManager> deploy(Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        return deployRemoteCall(SyscoinBattleManager.class, web3j, transactionManager, gasPrice, gasLimit, BINARY, "");
    }

    protected String getStaticDeployedAddress(String networkId) {
        return _addresses.get(networkId);
    }

    public static String getPreviouslyDeployedAddress(String networkId) {
        return _addresses.get(networkId);
    }

    public static class ChallengerConvictedEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Uint256 err;

        public Address challenger;
    }

    public static class NewBattleEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Address submitter;

        public Address challenger;
    }

    public static class RespondBlockHeadersEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Uint256 merkleHashCount;

        public Address submitter;
    }

    public static class SubmitterConvictedEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Uint256 err;

        public Address submitter;
    }
}
