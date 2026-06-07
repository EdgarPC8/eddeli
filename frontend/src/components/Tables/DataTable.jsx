import * as React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";

function DataTable({ data, columns }) {

  data.forEach((element,index) => {
      element["#"]=index+1
  
    if(!element.id){
      element["id"]=index
    }
  });

  return (
    <div style={{ height: 400, width: "100%", marginTop: 0 }}>
      <DataGrid
        rows={data}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 5 },
          },
        }}
        pageSizeOptions={[5, 25, 50, 100]}
   
      />
    </div>
  );
}

export default DataTable;

