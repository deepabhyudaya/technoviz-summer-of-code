import { AnimatedList } from "./ui/animated-list";

const Table = ({
  columns,
  renderRow,
  data,
}: {
  columns: { header: string; accessor: string; className?: string }[];
  renderRow: (item: any) => React.ReactNode;
  data: any[];
}) => {
  return (
    <table className="w-full mt-4">
      <thead>
        <tr className="text-left text-muted-foreground text-muted-foreground text-sm">
          {columns.map((col) => (
            <th key={col.accessor} className={col.className}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <AnimatedList isTable>
        {data.map((item) => renderRow(item))}
      </AnimatedList>
    </table>
  );
};

export default Table;
