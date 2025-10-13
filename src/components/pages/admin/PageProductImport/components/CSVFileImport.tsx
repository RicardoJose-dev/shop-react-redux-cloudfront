import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import axios from "axios";

type CSVFileImportProps = {
  url: string;
  title: string;
};

export default function CSVFileImport({ url, title }: CSVFileImportProps) {
  const [file, setFile] = React.useState<File>();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFile(file);
    }
  };

  const removeFile = () => {
    setFile(undefined);
  };

  const uploadFile = async (file: File | undefined) => {
    if (file === undefined) {
      return;
    }

    console.log("uploadFile to", url);

    try {
      const responseData = await axios({
        method: "GET",
        url,
        params: {
          fileName: encodeURIComponent(file.name),
        },
      }).then(({ data }) => data)

      const { body, statusCode } = responseData;
      const { signedUrl } = JSON.parse(body);
  
      if (statusCode !== 200) {
        throw new Error('Error getting signed URL')
      }

      console.log("File to upload: ", file.name);
      console.log("Uploading to: ", signedUrl);
  
      const result = await fetch(signedUrl, {
        method: "PUT",
        body: file,
      });
  
      console.log("Result: ", result);
    } catch (err) {
      console.log(err);
    } finally {
      setFile(undefined);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {!file ? (
        <input type="file" onChange={onFileChange} />
      ) : (
        <div>
          <button onClick={removeFile}>Remove file</button>
          <button onClick={() => uploadFile(file)}>Upload file</button>
        </div>
      )}
    </Box>
  );
}
