package org.sysethereum.agents.contract;

import io.reactivex.Flowable;
import io.reactivex.functions.Function;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.Callable;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.DynamicArray;
import org.web3j.abi.datatypes.DynamicBytes;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint32;
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
import org.web3j.tuples.generated.Tuple9;
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
public class SyscoinSuperblocks extends Contract {
    private static final String BINARY = "0x608060405234801561001057600080fd5b506123c4806100206000396000f3fe608060405234801561001057600080fd5b50600436106101425760003560e01c806374205786116100b8578063c0dde98b1161007c578063c0dde98b146106d0578063c1f67ab3146106ed578063cae0581e14610719578063ed8609761461075a578063f06d520d1461079b578063f09a4016146107a357610142565b806374205786146105b1578063828fa8b4146105dd57806395b45ee71461061e5780639e20c8031461064a578063a76a9b0f146106b357610142565b8063455e61661161010a578063455e61661461043b57806355e018ce146104435780635b572812146104605780635ec0aedd146104685780636823c56b146104705780636e5b70711461051457610142565b8063155ee89414610147578063244430381461016b57806327426f75146103bc5780632da8cffd146103e85780632e40019114610405575b600080fd5b61014f6107d3565b604080516001600160a01b039092168252519081900360200190f35b6103aa600480360360e081101561018157600080fd5b810190602081018135600160201b81111561019b57600080fd5b8201836020820111156101ad57600080fd5b803590602001918460018302840111600160201b831117156101ce57600080fd5b91908080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525092958435959094909350604081019250602001359050600160201b81111561022857600080fd5b82018360208201111561023a57600080fd5b803590602001918460208302840111600160201b8311171561025b57600080fd5b9190808060200260200160405190810160405280939291908181526020018383602002808284376000920191909152509295949360208101935035915050600160201b8111156102aa57600080fd5b8201836020820111156102bc57600080fd5b803590602001918460018302840111600160201b831117156102dd57600080fd5b91908080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525092958435959094909350604081019250602001359050600160201b81111561033757600080fd5b82018360208201111561034957600080fd5b803590602001918460208302840111600160201b8311171561036a57600080fd5b91908080602002602001604051908101604052809392919081815260200183836020028082843760009201919091525092955050913592506107e2915050565b60408051918252519081900360200190f35b6103aa600480360360408110156103d257600080fd5b50803590602001356001600160a01b03166109dc565b6103aa600480360360208110156103fe57600080fd5b5035610b14565b6104226004803603602081101561041b57600080fd5b5035610b29565b6040805163ffffffff9092168252519081900360200190f35b6103aa610b4b565b6103aa6004803603602081101561045957600080fd5b5035610b57565b6103aa610b6c565b61014f610b91565b6103aa6004803603602081101561048657600080fd5b810190602081018135600160201b8111156104a057600080fd5b8201836020820111156104b257600080fd5b803590602001918460018302840111600160201b831117156104d357600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610ba0945050505050565b6105316004803603602081101561052a57600080fd5b5035610bb8565b604051808a81526020018981526020018881526020018781526020018663ffffffff1663ffffffff168152602001858152602001846001600160a01b03166001600160a01b0316815260200183600581111561058957fe5b60ff16815263ffffffff90921660208301525060408051918290030198509650505050505050f35b6103aa600480360360408110156105c757600080fd5b50803590602001356001600160a01b0316610c1d565b6103aa600480360360c08110156105f357600080fd5b5080359060208101359060408101359060608101359063ffffffff6080820135169060a00135610d53565b6103aa6004803603604081101561063457600080fd5b50803590602001356001600160a01b0316610dab565b61069a600480360360e081101561066057600080fd5b50803590602081013590604081013590606081013590608081013563ffffffff169060a08101359060c001356001600160a01b0316610fa5565b6040805192835260208301919091528051918290030190f35b6103aa600480360360208110156106c957600080fd5b5035611241565b6103aa600480360360208110156106e657600080fd5b5035611256565b6103aa6004803603604081101561070357600080fd5b50803590602001356001600160a01b031661128a565b6107366004803603602081101561072f57600080fd5b503561140d565b6040518082600581111561074657fe5b60ff16815260200191505060405180910390f35b61069a600480360360c081101561077057600080fd5b5080359060208101359060408101359060608101359063ffffffff6080820135169060a0013561142c565b6103aa611585565b6107d1600480360360408110156107b957600080fd5b506001600160a01b038135811691602001351661158b565b005b6036546001600160a01b031681565b6000818152603360205260408120546108046107fd876116b6565b868661184f565b1461084f576040805160008152614e48602082015281517f4e64138cc499eb1adf9edff9ef69bd45c56ac4bfd307540952e4c9d51eab55c1929181900390910190a150614e486109d1565b600061085e8989898987611a5e565b9050801561098d576000806000806000806108788f611ae7565b939a509198509296509194509250905083156108d857604080518881526020810186905281517f4e64138cc499eb1adf9edff9ef69bd45c56ac4bfd307540952e4c9d51eab55c1929181900390910190a1839750505050505050506109d1565b60355460008a8152603360205260408082206005015481516315eade2b60e31b8152600481018c9052602481018b90526001600160a01b038a811660448301529182166064820152868216608482015263ffffffff881660a482015260ff861660c4820152915193169263af56f1589260e48084019391929182900301818387803b15801561096657600080fd5b505af115801561097a573d6000803e3d6000fd5b50505050859750505050505050506109d1565b604080516000815261753a602082015281517f4e64138cc499eb1adf9edff9ef69bd45c56ac4bfd307540952e4c9d51eab55c1929181900390910190a161753a9150505b979650505050505050565b6036546000906001600160a01b03163314610a24576040805184815261c39660208201528151600080516020612342833981519152929181900390910190a15061c396610b0e565b60008381526033602052604090206002600582810154600160e01b900460ff1690811115610a4e57fe5b14158015610a7657506001600582810154600160e01b900460ff1690811115610a7357fe5b14155b15610ab0576040805185815261c36460208201528151600080516020612342833981519152929181900390910190a161c364915050610b0e565b60058101805460ff60e01b1916600360e01b179055604080518581526001600160a01b038516602082015281517f87f54f5eb3dd119fe71af0915af693e64a5bfd4acaa19a6c944c47cff8eec9e6929181900390910190a160009150505b92915050565b60009081526033602052604090206001015490565b600090815260336020526040902060050154600160c01b900463ffffffff1690565b6729a2241af62c000081565b60009081526033602052604090206004015490565b603454600090815260336020526040902060050154600160c01b900463ffffffff1690565b6035546001600160a01b031681565b6044810151600090610bb181611b7e565b9392505050565b600090815260336020526040902080546001820154600283015460038401546005850154600490950154939592949193909263ffffffff600160a01b84048116936001600160a01b0381169260ff600160e01b83041692600160c01b90920490911690565b6036546000906001600160a01b03163314610c65576040805184815261c39660208201528151600080516020612342833981519152929181900390910190a15061c396610b0e565b60008381526033602052604090206002600582810154600160e01b900460ff1690811115610c8f57fe5b14158015610cb757506003600582810154600160e01b900460ff1690811115610cb457fe5b14155b15610cf1576040805185815261c36460208201528151600080516020612342833981519152929181900390910190a161c364915050610b0e565b60058101805460ff60e01b1916600560e01b179055604080518581526001600160a01b038516602082015281517f64297372062dfcb21d6f7385f68d4656e993be2bb674099e3de73128d4911a91929181900390910190a15060009392505050565b60408051602080820198909852808201969096526060860194909452608085019290925260e01b6001600160e01b03191660a084015260a4808401919091528151808403909101815260c49092019052805191012090565b6036546000906001600160a01b03163314610df3576040805184815261c39660208201528151600080516020612342833981519152929181900390910190a15061c396610b0e565b60008381526033602052604090206001600582810154600160e01b900460ff1690811115610e1d57fe5b14158015610e4557506003600582810154600160e01b900460ff1690811115610e4257fe5b14155b15610e7f576040805185815261c36460208201528151600080516020612342833981519152929181900390910190a161c364915050610b0e565b610e87610b6c565b6005820154600160c01b900463ffffffff1611610ed3576040805185815261c3fa60208201528151600080516020612342833981519152929181900390910190a161c3fa915050610b0e565b600480820154600090815260336020526040902090600582810154600160e01b900460ff1690811115610f0257fe5b14610f3d576040805186815261c37860208201528151600080516020612342833981519152929181900390910190a161c37892505050610b0e565b60058201805460ff60e01b1916600160e21b1790556034859055604080518681526001600160a01b038616602082015281517ff2dbbf0abb1ab1870a5e4d02746747c91d167c855255440b573ba3b5529dc901929181900390910190a1506000949350505050565b60365460009081906001600160a01b03163314610ff457604080516000815261c39660208201528151600080516020612342833981519152929181900390910190a15061c39690506000611235565b60008481526033602052604090206003600582810154600160e01b900460ff169081111561101e57fe5b1415801561104657506004600582810154600160e01b900460ff169081111561104357fe5b14155b156110bf576000805160206123428339815191528582600501601c9054906101000a900460ff16600581111561107857fe5b6040805192835261c3789190910160208301528051918290030190a1600581810154600160e01b900460ff16908111156110ae57fe5b61c378019250600091506112359050565b6110c7610b6c565b6005820154600160c01b900463ffffffff161015611118576040805186815261c3fa60208201528151600080516020612342833981519152929181900390910190a15061c3fa915060009050611235565b60006111288b8b8b8b8b8b610d53565b6000818152603360205260408120919250600582810154600160e01b900460ff169081111561115357fe5b14156111c4578b815560018082018c9055600282018b9055600382018a905560048201889055600580850154908301805463ffffffff8c8116600160a01b0263ffffffff60a01b19600160c01b95869004831690960190911690930263ffffffff60c01b1990911617929092161790555b60058101805460ff60e01b1916600160e01b176001600160a01b0319166001600160a01b03881690811790915560408051848152602081019290925280517f64951c9008bba9f4663c12662e7a9b6412a7c4757869fdac09285564ae923fa19281900390910190a150600093509150505b97509795505050505050565b60009081526033602052604090206002015490565b6034546000905b8261126782610b29565b63ffffffff161115610b0e5760009081526033602052604090206004015461125d565b6036546000906001600160a01b031633146112d2576040805184815261c39660208201528151600080516020612342833981519152929181900390910190a15061c396610b0e565b60008381526033602052604090206001600582810154600160e01b900460ff16908111156112fc57fe5b1415801561132457506002600582810154600160e01b900460ff169081111561132157fe5b14155b1561135e576040805185815261c36460208201528151600080516020612342833981519152929181900390910190a161c364915050610b0e565b60058101546001600160a01b03848116911614156113ab576040805185815261c38760208201528151600080516020612342833981519152929181900390910190a161c387915050610b0e565b60058101805460ff60e01b1916600160e11b179055604080518581526001600160a01b038516602082015281517f09cdaca254aa177f759fe7a0968fe696ee9baf7d2a1d4714ed24b83d1f09518e929181900390910190a15060009392505050565b600090815260336020526040902060050154600160e01b900460ff1690565b60345460009081901561143e57600080fd5b821561144957600080fd5b6000611459898989898989610d53565b6000818152603360205260408120919250600582810154600160e01b900460ff169081111561148457fe5b1461148e57600080fd5b89815560018101899055600281018890556003810187905560048101859055600581018054600160c01b336001600160a01b0319909216821763ffffffff60c01b19161763ffffffff60a01b1916600160a01b63ffffffff8a16021760ff60e01b1916600160e21b1790915560408051848152602081019290925280517f64951c9008bba9f4663c12662e7a9b6412a7c4757869fdac09285564ae923fa19281900390910190a160348290556040805183815233602082015281517ff2dbbf0abb1ab1870a5e4d02746747c91d167c855255440b573ba3b5529dc901929181900390910190a1506000999098509650505050505050565b60345490565b600054610100900460ff16806115a457506115a4611ca8565b806115b2575060005460ff16155b6115ed5760405162461bcd60e51b815260040180806020018281038252602e815260200180612362602e913960400191505060405180910390fd5b600054610100900460ff16158015611618576000805460ff1961ff0019909116610100171660011790555b6035546001600160a01b031615801561163957506001600160a01b03831615155b61164257600080fd5b603580546001600160a01b0319166001600160a01b03858116919091179091556036541615801561167b57506001600160a01b03821615155b61168457600080fd5b603680546001600160a01b0319166001600160a01b03841617905580156116b1576000805461ff00191690555b505050565b6000610b0e600280846040516020018082805190602001908083835b602083106116f15780518252601f1990920191602091820191016116d2565b6001836020036101000a0380198251168184511680821785525050505050509050019150506040516020818303038152906040526040518082805190602001908083835b602083106117545780518252601f199092019160209182019101611735565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015611793573d6000803e3d6000fd5b5050506040513d60208110156117a857600080fd5b50516040805160208181019390935281518082038401815290820191829052805190928291908401908083835b602083106117f45780518252601f1990920191602091820191016117d5565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015611833573d6000803e3d6000fd5b5050506040513d602081101561184857600080fd5b5051611b7e565b8051600090815b818110156118995761187a84828151811061186d57fe5b6020026020010151611b7e565b84828151811061188657fe5b6020908102919091010152600101611856565b506000806118a687611b7e565b90505b82821015611a555760008583815181106118bf57fe5b60200260200101519050600080600289816118d657fe5b06600114156118e95750819050826118ef565b50829050815b600280838360405160200180838152602001828152602001925050506040516020818303038152906040526040518082805190602001908083835b602083106119495780518252601f19909201916020918201910161192a565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015611988573d6000803e3d6000fd5b5050506040513d602081101561199d57600080fd5b50516040805160208181019390935281518082038401815290820191829052805190928291908401908083835b602083106119e95780518252601f1990920191602091820191016119ca565b51815160209384036101000a60001901801990921691161790526040519190930194509192505080830381855afa158015611a28573d6000803e3d6000fd5b5050506040513d6020811015611a3d57600080fd5b505193506002890498506001850194505050506118a9565b6109d181611b7e565b600080611a6a876116b6565b9050865160401415611abc5760408051828152614e5c602082015281517f65bd72698b9ffcfb3c7cb4c7414e13225cabd57fb690e183ae8c01c8ec268ebd929181900390910190a16000915050611ade565b611ac98187878787611cae565b60011415611ad8579050611ade565b60009150505b95945050505050565b6000808080808080808080808080611aff8e82611d74565b935063ffffffff841661740714611b2c57506127ba9b50949950919750919550919350909150611b759050565b611b378e6004611db0565b9050611b438e82611e32565b809750819650829a50839950849b505050505050600087868885878595509c509c509c509c509c509c50505050505050505b91939550919395565b60405160009060ff8316815382601e1a600182015382601d1a600282015382601c1a600382015382601b1a600482015382601a1a60058201538260191a60068201538260181a60078201538260171a60088201538260161a60098201538260151a600a8201538260141a600b8201538260131a600c8201538260121a600d8201538260111a600e8201538260101a600f82015382600f1a601082015382600e1a601182015382600d1a601282015382600c1a601382015382600b1a601482015382600a1a60158201538260091a60168201538260081a60178201538260071a60188201538260061a60198201538260051a601a8201538260041a601b8201538260031a601c8201538260021a601d8201538260011a601e8201538260001a601f8201535192915050565b303b1590565b6000611cb982611ed6565b611d025760408051878152614e3e602082015281517f65bd72698b9ffcfb3c7cb4c7414e13225cabd57fb690e183ae8c01c8ec268ebd929181900390910190a150614e3e611ade565b6000611d0d84610ba0565b905080611d1b88888861184f565b14611d675760408051888152614e52602082015281517f65bd72698b9ffcfb3c7cb4c7414e13225cabd57fb690e183ae8c01c8ec268ebd929181900390910190a1614e52915050611ade565b5060019695505050505050565b6000816020840101516040518160031a60008201538160021a60018201538160011a60028201538160001a60038201535160e01c949350505050565b6000806000611dbf8585611ef5565b9450915081611def57611dd28585611ef5565b9450915081611de057600080fd5b611dea8585611ef5565b945091505b60648210611dfc57600080fd5b60005b82811015611e2857602485019450611e178686611ef5565b810160040195509150600101611dff565b5092949350505050565b60008080808080808080808080611e498e8e611ef5565b9d509050600a8110611e5a57600080fd5b60005b81811015611ebf5760088e019d50611e758f8f611ef5565b9e509750611e838f8f611fa8565b611e94579c87019c60009650611eb7565b60018e019d50611ea48f8f611fd7565b939a509098509096509094509250611ebf565b600101611e5d565b50949d929c50929a50919850909650945050505050565b60006004611ee38361140d565b6005811115611eee57fe5b1492915050565b6000806000848481518110611f0657fe5b01602001516001949094019360f81c905060fd811015611f2d5760ff169150829050611fa1565b8060ff1660fd1415611f5357611f4585856010612102565b846002019250925050611fa1565b8060ff1660fe1415611f7957611f6b85856020612102565b846004019250925050611fa1565b8060ff1660ff1415611f9f57611f9185856040612102565b846008019250925050611fa1565b505b9250929050565b8151600090603560f91b90849084908110611fbf57fe5b01602001516001600160f81b03191614905092915050565b6000806000806000806000806000806000611ff28d8d612144565b9c509050600460ff82161461200657600080fd5b6120108d8d612176565b95508060ff168c019b506120248d8d612144565b9c509050600860ff82161461203857600080fd5b6120428d8d612205565b67ffffffffffffffff1692508060ff168c019b506120608d8d612144565b9c509050601460ff82161461207457600080fd5b61207e8d8d612339565b94508060ff168c019b506120928d8d612144565b9c509050600160ff8216146120a657600080fd5b8c8c815181106120b257fe5b016020015160ff82169c909c019b60f81c91506120cf8d8d612144565b9c509050601460ff8216146120e357600080fd5b6120ed8d8d612339565b929d949c50949a509850965090945050505050565b6000805b6008830481101561213c578060080260020a858286018151811061212657fe5b016020015160f81c029190910190600101612106565b509392505050565b6000808351831061215457600080fd5b83838151811061216057fe5b016020015160f81c915050600182019250929050565b600082828151811061218457fe5b602001015160f81c60f81b60f81c60ff166301000000028383600101815181106121aa57fe5b602001015160f81c60f81b60f81c60ff1662010000028484600201815181106121cf57fe5b602001015160f81c60f81b60f81c60ff16610100028585600301815181106121f357fe5b016020015160f81c0101019392505050565b600082828151811061221357fe5b602001015160f81c60f81b60f81c60ff166701000000000000000283836001018151811061223d57fe5b602001015160f81c60f81b60f81c60ff1666010000000000000284846002018151811061226657fe5b602001015160f81c60f81b60f81c60ff16650100000000000285856003018151811061228e57fe5b602001015160f81c60f81b60f81c60ff16600160201b028686600401815181106122b457fe5b602001015160f81c60f81b60f81c60ff166301000000028787600501815181106122da57fe5b602001015160f81c60f81b60f81c60ff1662010000028888600601815181106122ff57fe5b602001015160f81c60f81b60f81c60ff166101000289896007018151811061232357fe5b016020015160f81c010101010101019392505050565b01601401519056fea57c1ba4cf2c89b3558cfeeca4339e04551f0fc1a12cf63f1923c2eed8a5be8b436f6e747261637420696e7374616e63652068617320616c7265616479206265656e20696e697469616c697a6564a265627a7a723158208138991d42ad13b49e2235c526cea45e805e118317b8eb7a522ef8d15865ae7264736f6c634300050d0032";

    public static final String FUNC_MINPROPOSALDEPOSIT = "minProposalDeposit";

    public static final String FUNC_SYSCOINERC20MANAGER = "syscoinERC20Manager";

    public static final String FUNC_TRUSTEDCLAIMMANAGER = "trustedClaimManager";

    public static final String FUNC_INIT = "init";

    public static final String FUNC_GETHEADERMERKLEROOT = "getHeaderMerkleRoot";

    public static final String FUNC_INITIALIZE = "initialize";

    public static final String FUNC_PROPOSE = "propose";

    public static final String FUNC_CONFIRM = "confirm";

    public static final String FUNC_CHALLENGE = "challenge";

    public static final String FUNC_SEMIAPPROVE = "semiApprove";

    public static final String FUNC_INVALIDATE = "invalidate";

    public static final String FUNC_RELAYTX = "relayTx";

    public static final String FUNC_CALCSUPERBLOCKHASH = "calcSuperblockHash";

    public static final String FUNC_GETBESTSUPERBLOCK = "getBestSuperblock";

    public static final String FUNC_GETSUPERBLOCK = "getSuperblock";

    public static final String FUNC_GETSUPERBLOCKHEIGHT = "getSuperblockHeight";

    public static final String FUNC_GETSUPERBLOCKTIMESTAMP = "getSuperblockTimestamp";

    public static final String FUNC_GETSUPERBLOCKMEDIANTIMESTAMP = "getSuperblockMedianTimestamp";

    public static final String FUNC_GETSUPERBLOCKPARENTID = "getSuperblockParentId";

    public static final String FUNC_GETSUPERBLOCKSTATUS = "getSuperblockStatus";

    public static final String FUNC_GETCHAINHEIGHT = "getChainHeight";

    public static final String FUNC_GETSUPERBLOCKAT = "getSuperblockAt";

    public static final Event APPROVEDSUPERBLOCK_EVENT = new Event("ApprovedSuperblock", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event CHALLENGESUPERBLOCK_EVENT = new Event("ChallengeSuperblock", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event ERRORSUPERBLOCK_EVENT = new Event("ErrorSuperblock", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}));
    ;

    public static final Event INVALIDSUPERBLOCK_EVENT = new Event("InvalidSuperblock", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event NEWSUPERBLOCK_EVENT = new Event("NewSuperblock", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event RELAYTRANSACTION_EVENT = new Event("RelayTransaction", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}));
    ;

    public static final Event SEMIAPPROVEDSUPERBLOCK_EVENT = new Event("SemiApprovedSuperblock", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Address>() {}));
    ;

    public static final Event VERIFYTRANSACTION_EVENT = new Event("VerifyTransaction", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}));
    ;

    protected static final HashMap<String, String> _addresses;

    static {
        _addresses = new HashMap<String, String>();
        _addresses.put("1574366396956", "0x03417d43E98994BAB34390e8E74996A97066F047");
    }

    @Deprecated
    protected SyscoinSuperblocks(String contractAddress, Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    protected SyscoinSuperblocks(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, credentials, contractGasProvider);
    }

    @Deprecated
    protected SyscoinSuperblocks(String contractAddress, Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    protected SyscoinSuperblocks(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public List<ApprovedSuperblockEventResponse> getApprovedSuperblockEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(APPROVEDSUPERBLOCK_EVENT, transactionReceipt);
        ArrayList<ApprovedSuperblockEventResponse> responses = new ArrayList<ApprovedSuperblockEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            ApprovedSuperblockEventResponse typedResponse = new ApprovedSuperblockEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.who = (Address) eventValues.getNonIndexedValues().get(1);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<ApprovedSuperblockEventResponse> approvedSuperblockEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, ApprovedSuperblockEventResponse>() {
            @Override
            public ApprovedSuperblockEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(APPROVEDSUPERBLOCK_EVENT, log);
                ApprovedSuperblockEventResponse typedResponse = new ApprovedSuperblockEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.who = (Address) eventValues.getNonIndexedValues().get(1);
                return typedResponse;
            }
        });
    }

    public Flowable<ApprovedSuperblockEventResponse> approvedSuperblockEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(APPROVEDSUPERBLOCK_EVENT));
        return approvedSuperblockEventFlowable(filter);
    }

    public List<ChallengeSuperblockEventResponse> getChallengeSuperblockEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(CHALLENGESUPERBLOCK_EVENT, transactionReceipt);
        ArrayList<ChallengeSuperblockEventResponse> responses = new ArrayList<ChallengeSuperblockEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            ChallengeSuperblockEventResponse typedResponse = new ChallengeSuperblockEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.who = (Address) eventValues.getNonIndexedValues().get(1);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<ChallengeSuperblockEventResponse> challengeSuperblockEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, ChallengeSuperblockEventResponse>() {
            @Override
            public ChallengeSuperblockEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(CHALLENGESUPERBLOCK_EVENT, log);
                ChallengeSuperblockEventResponse typedResponse = new ChallengeSuperblockEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.who = (Address) eventValues.getNonIndexedValues().get(1);
                return typedResponse;
            }
        });
    }

    public Flowable<ChallengeSuperblockEventResponse> challengeSuperblockEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(CHALLENGESUPERBLOCK_EVENT));
        return challengeSuperblockEventFlowable(filter);
    }

    public List<ErrorSuperblockEventResponse> getErrorSuperblockEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(ERRORSUPERBLOCK_EVENT, transactionReceipt);
        ArrayList<ErrorSuperblockEventResponse> responses = new ArrayList<ErrorSuperblockEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            ErrorSuperblockEventResponse typedResponse = new ErrorSuperblockEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(1);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<ErrorSuperblockEventResponse> errorSuperblockEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, ErrorSuperblockEventResponse>() {
            @Override
            public ErrorSuperblockEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(ERRORSUPERBLOCK_EVENT, log);
                ErrorSuperblockEventResponse typedResponse = new ErrorSuperblockEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.err = (Uint256) eventValues.getNonIndexedValues().get(1);
                return typedResponse;
            }
        });
    }

    public Flowable<ErrorSuperblockEventResponse> errorSuperblockEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(ERRORSUPERBLOCK_EVENT));
        return errorSuperblockEventFlowable(filter);
    }

    public List<InvalidSuperblockEventResponse> getInvalidSuperblockEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(INVALIDSUPERBLOCK_EVENT, transactionReceipt);
        ArrayList<InvalidSuperblockEventResponse> responses = new ArrayList<InvalidSuperblockEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            InvalidSuperblockEventResponse typedResponse = new InvalidSuperblockEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.who = (Address) eventValues.getNonIndexedValues().get(1);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<InvalidSuperblockEventResponse> invalidSuperblockEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, InvalidSuperblockEventResponse>() {
            @Override
            public InvalidSuperblockEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(INVALIDSUPERBLOCK_EVENT, log);
                InvalidSuperblockEventResponse typedResponse = new InvalidSuperblockEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.who = (Address) eventValues.getNonIndexedValues().get(1);
                return typedResponse;
            }
        });
    }

    public Flowable<InvalidSuperblockEventResponse> invalidSuperblockEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(INVALIDSUPERBLOCK_EVENT));
        return invalidSuperblockEventFlowable(filter);
    }

    public List<NewSuperblockEventResponse> getNewSuperblockEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(NEWSUPERBLOCK_EVENT, transactionReceipt);
        ArrayList<NewSuperblockEventResponse> responses = new ArrayList<NewSuperblockEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            NewSuperblockEventResponse typedResponse = new NewSuperblockEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.who = (Address) eventValues.getNonIndexedValues().get(1);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<NewSuperblockEventResponse> newSuperblockEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, NewSuperblockEventResponse>() {
            @Override
            public NewSuperblockEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(NEWSUPERBLOCK_EVENT, log);
                NewSuperblockEventResponse typedResponse = new NewSuperblockEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.who = (Address) eventValues.getNonIndexedValues().get(1);
                return typedResponse;
            }
        });
    }

    public Flowable<NewSuperblockEventResponse> newSuperblockEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(NEWSUPERBLOCK_EVENT));
        return newSuperblockEventFlowable(filter);
    }

    public List<RelayTransactionEventResponse> getRelayTransactionEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(RELAYTRANSACTION_EVENT, transactionReceipt);
        ArrayList<RelayTransactionEventResponse> responses = new ArrayList<RelayTransactionEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            RelayTransactionEventResponse typedResponse = new RelayTransactionEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.txHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.returnCode = (Uint256) eventValues.getNonIndexedValues().get(1);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<RelayTransactionEventResponse> relayTransactionEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, RelayTransactionEventResponse>() {
            @Override
            public RelayTransactionEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(RELAYTRANSACTION_EVENT, log);
                RelayTransactionEventResponse typedResponse = new RelayTransactionEventResponse();
                typedResponse.log = log;
                typedResponse.txHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.returnCode = (Uint256) eventValues.getNonIndexedValues().get(1);
                return typedResponse;
            }
        });
    }

    public Flowable<RelayTransactionEventResponse> relayTransactionEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(RELAYTRANSACTION_EVENT));
        return relayTransactionEventFlowable(filter);
    }

    public List<SemiApprovedSuperblockEventResponse> getSemiApprovedSuperblockEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(SEMIAPPROVEDSUPERBLOCK_EVENT, transactionReceipt);
        ArrayList<SemiApprovedSuperblockEventResponse> responses = new ArrayList<SemiApprovedSuperblockEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            SemiApprovedSuperblockEventResponse typedResponse = new SemiApprovedSuperblockEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.who = (Address) eventValues.getNonIndexedValues().get(1);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<SemiApprovedSuperblockEventResponse> semiApprovedSuperblockEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, SemiApprovedSuperblockEventResponse>() {
            @Override
            public SemiApprovedSuperblockEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(SEMIAPPROVEDSUPERBLOCK_EVENT, log);
                SemiApprovedSuperblockEventResponse typedResponse = new SemiApprovedSuperblockEventResponse();
                typedResponse.log = log;
                typedResponse.superblockHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.who = (Address) eventValues.getNonIndexedValues().get(1);
                return typedResponse;
            }
        });
    }

    public Flowable<SemiApprovedSuperblockEventResponse> semiApprovedSuperblockEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(SEMIAPPROVEDSUPERBLOCK_EVENT));
        return semiApprovedSuperblockEventFlowable(filter);
    }

    public List<VerifyTransactionEventResponse> getVerifyTransactionEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = extractEventParametersWithLog(VERIFYTRANSACTION_EVENT, transactionReceipt);
        ArrayList<VerifyTransactionEventResponse> responses = new ArrayList<VerifyTransactionEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            VerifyTransactionEventResponse typedResponse = new VerifyTransactionEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.txHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
            typedResponse.returnCode = (Uint256) eventValues.getNonIndexedValues().get(1);
            responses.add(typedResponse);
        }
        return responses;
    }

    public Flowable<VerifyTransactionEventResponse> verifyTransactionEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(new Function<Log, VerifyTransactionEventResponse>() {
            @Override
            public VerifyTransactionEventResponse apply(Log log) {
                Contract.EventValuesWithLog eventValues = extractEventParametersWithLog(VERIFYTRANSACTION_EVENT, log);
                VerifyTransactionEventResponse typedResponse = new VerifyTransactionEventResponse();
                typedResponse.log = log;
                typedResponse.txHash = (Bytes32) eventValues.getNonIndexedValues().get(0);
                typedResponse.returnCode = (Uint256) eventValues.getNonIndexedValues().get(1);
                return typedResponse;
            }
        });
    }

    public Flowable<VerifyTransactionEventResponse> verifyTransactionEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(VERIFYTRANSACTION_EVENT));
        return verifyTransactionEventFlowable(filter);
    }

    public RemoteFunctionCall<Uint256> minProposalDeposit() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_MINPROPOSALDEPOSIT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Address> syscoinERC20Manager() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_SYSCOINERC20MANAGER, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Address> trustedClaimManager() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_TRUSTEDCLAIMMANAGER, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<TransactionReceipt> init(Address _syscoinERC20Manager, Address _claimManager) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_INIT, 
                Arrays.<Type>asList(_syscoinERC20Manager, _claimManager), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<Uint256> getHeaderMerkleRoot(DynamicBytes _blockHeader) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETHEADERMERKLEROOT, 
                Arrays.<Type>asList(_blockHeader), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<TransactionReceipt> initialize(Bytes32 _blocksMerkleRoot, Uint256 _timestamp, Uint256 _mtpTimestamp, Bytes32 _lastHash, Uint32 _lastBits, Bytes32 _parentId) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_INITIALIZE, 
                Arrays.<Type>asList(_blocksMerkleRoot, _timestamp, _mtpTimestamp, _lastHash, _lastBits, _parentId), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> propose(Bytes32 _blocksMerkleRoot, Uint256 _timestamp, Uint256 _mtpTimestamp, Bytes32 _lastHash, Uint32 _lastBits, Bytes32 _parentId, Address submitter) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_PROPOSE, 
                Arrays.<Type>asList(_blocksMerkleRoot, _timestamp, _mtpTimestamp, _lastHash, _lastBits, _parentId, submitter), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> confirm(Bytes32 _superblockHash, Address _validator) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_CONFIRM, 
                Arrays.<Type>asList(_superblockHash, _validator), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> challenge(Bytes32 _superblockHash, Address _challenger) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_CHALLENGE, 
                Arrays.<Type>asList(_superblockHash, _challenger), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> semiApprove(Bytes32 _superblockHash, Address _validator) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_SEMIAPPROVE, 
                Arrays.<Type>asList(_superblockHash, _validator), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> invalidate(Bytes32 _superblockHash, Address _validator) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_INVALIDATE, 
                Arrays.<Type>asList(_superblockHash, _validator), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> relayTx(DynamicBytes _txBytes, Uint256 _txIndex, DynamicArray<Uint256> _txSiblings, DynamicBytes _syscoinBlockHeader, Uint256 _syscoinBlockIndex, DynamicArray<Uint256> _syscoinBlockSiblings, Bytes32 _superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(
                FUNC_RELAYTX, 
                Arrays.<Type>asList(_txBytes, _txIndex, _txSiblings, _syscoinBlockHeader, _syscoinBlockIndex, _syscoinBlockSiblings, _superblockHash), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<Bytes32> calcSuperblockHash(Bytes32 _blocksMerkleRoot, Uint256 _timestamp, Uint256 _mtpTimestamp, Bytes32 _lastHash, Uint32 _lastBits, Bytes32 _parentId) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_CALCSUPERBLOCKHASH, 
                Arrays.<Type>asList(_blocksMerkleRoot, _timestamp, _mtpTimestamp, _lastHash, _lastBits, _parentId), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Bytes32> getBestSuperblock() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETBESTSUPERBLOCK, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Tuple9<Bytes32, Uint256, Uint256, Bytes32, Uint32, Bytes32, Address, Uint8, Uint32>> getSuperblock(Bytes32 superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETSUPERBLOCK, 
                Arrays.<Type>asList(superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}, new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}, new TypeReference<Bytes32>() {}, new TypeReference<Uint32>() {}, new TypeReference<Bytes32>() {}, new TypeReference<Address>() {}, new TypeReference<Uint8>() {}, new TypeReference<Uint32>() {}));
        return new RemoteFunctionCall<Tuple9<Bytes32, Uint256, Uint256, Bytes32, Uint32, Bytes32, Address, Uint8, Uint32>>(function,
                new Callable<Tuple9<Bytes32, Uint256, Uint256, Bytes32, Uint32, Bytes32, Address, Uint8, Uint32>>() {
                    @Override
                    public Tuple9<Bytes32, Uint256, Uint256, Bytes32, Uint32, Bytes32, Address, Uint8, Uint32> call() throws Exception {
                        List<Type> results = executeCallMultipleValueReturn(function);
                        return new Tuple9<Bytes32, Uint256, Uint256, Bytes32, Uint32, Bytes32, Address, Uint8, Uint32>(
                                (Bytes32) results.get(0), 
                                (Uint256) results.get(1), 
                                (Uint256) results.get(2), 
                                (Bytes32) results.get(3), 
                                (Uint32) results.get(4), 
                                (Bytes32) results.get(5), 
                                (Address) results.get(6), 
                                (Uint8) results.get(7), 
                                (Uint32) results.get(8));
                    }
                });
    }

    public RemoteFunctionCall<Uint32> getSuperblockHeight(Bytes32 superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETSUPERBLOCKHEIGHT, 
                Arrays.<Type>asList(superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint32>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint256> getSuperblockTimestamp(Bytes32 _superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETSUPERBLOCKTIMESTAMP, 
                Arrays.<Type>asList(_superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint256> getSuperblockMedianTimestamp(Bytes32 _superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETSUPERBLOCKMEDIANTIMESTAMP, 
                Arrays.<Type>asList(_superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Bytes32> getSuperblockParentId(Bytes32 _superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETSUPERBLOCKPARENTID, 
                Arrays.<Type>asList(_superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint8> getSuperblockStatus(Bytes32 _superblockHash) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETSUPERBLOCKSTATUS, 
                Arrays.<Type>asList(_superblockHash), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint8>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Uint256> getChainHeight() {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETCHAINHEIGHT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    public RemoteFunctionCall<Bytes32> getSuperblockAt(Uint256 _height) {
        final org.web3j.abi.datatypes.Function function = new org.web3j.abi.datatypes.Function(FUNC_GETSUPERBLOCKAT, 
                Arrays.<Type>asList(_height), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>() {}));
        return executeRemoteCallSingleValueReturn(function);
    }

    @Deprecated
    public static SyscoinSuperblocks load(String contractAddress, Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        return new SyscoinSuperblocks(contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    @Deprecated
    public static SyscoinSuperblocks load(String contractAddress, Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        return new SyscoinSuperblocks(contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    public static SyscoinSuperblocks load(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        return new SyscoinSuperblocks(contractAddress, web3j, credentials, contractGasProvider);
    }

    public static SyscoinSuperblocks load(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        return new SyscoinSuperblocks(contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static RemoteCall<SyscoinSuperblocks> deploy(Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        return deployRemoteCall(SyscoinSuperblocks.class, web3j, credentials, contractGasProvider, BINARY, "");
    }

    @Deprecated
    public static RemoteCall<SyscoinSuperblocks> deploy(Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        return deployRemoteCall(SyscoinSuperblocks.class, web3j, credentials, gasPrice, gasLimit, BINARY, "");
    }

    public static RemoteCall<SyscoinSuperblocks> deploy(Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        return deployRemoteCall(SyscoinSuperblocks.class, web3j, transactionManager, contractGasProvider, BINARY, "");
    }

    @Deprecated
    public static RemoteCall<SyscoinSuperblocks> deploy(Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        return deployRemoteCall(SyscoinSuperblocks.class, web3j, transactionManager, gasPrice, gasLimit, BINARY, "");
    }

    protected String getStaticDeployedAddress(String networkId) {
        return _addresses.get(networkId);
    }

    public static String getPreviouslyDeployedAddress(String networkId) {
        return _addresses.get(networkId);
    }

    public static class ApprovedSuperblockEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Address who;
    }

    public static class ChallengeSuperblockEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Address who;
    }

    public static class ErrorSuperblockEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Uint256 err;
    }

    public static class InvalidSuperblockEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Address who;
    }

    public static class NewSuperblockEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Address who;
    }

    public static class RelayTransactionEventResponse extends BaseEventResponse {
        public Bytes32 txHash;

        public Uint256 returnCode;
    }

    public static class SemiApprovedSuperblockEventResponse extends BaseEventResponse {
        public Bytes32 superblockHash;

        public Address who;
    }

    public static class VerifyTransactionEventResponse extends BaseEventResponse {
        public Bytes32 txHash;

        public Uint256 returnCode;
    }
}
