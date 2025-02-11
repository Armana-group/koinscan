export const ProjectDescription = () => {
  return (
    <section>
      <h2>Koinos Contract Interface Tool</h2>
      <div>
        The Koinos Contract Interface Tool is a web-based application designed
        to help developers interact with smart contracts on the Koinos
        blockchain. It dynamically generates a user interface based on the ABI
        (Application Binary Interface) of a smart contract, allowing developers
        to easily call functions and interact with contracts without writing
        custom code.
      </div>
      <div>
        <h3>Key Features</h3>
        <ul>
          <li>
            <span>Dynamic Interface Generation:</span> Automatically creates a
            user-friendly interface from a smart contract's ABI.
          </li>
          <li>
            <span>Function Execution:</span> Supports both read (querying data
            without making a transaction) and write (making transactions)
            operations on the blockchain.
          </li>
          <li>
            <span>Wallet Integration:</span> Connects with Kondor wallet, wallet
            connect (Konio and Portal), and My Koinos Wallet for seamless
            transactions and interactions.
          </li>
          <li>
            <span>Transaction and Result Display:</span> Shows detailed
            information about transactions and their results, including mining
            status and errors.
          </li>
        </ul>
      </div>
    </section>
  );
};
