import {useState, useEffect} from 'react';






const Test = () => {


    const [formData, setFormData] = useState({
        title: '',
        description: ''
    });


/**
 * 
 * @returns SESSION TOKEN FOR POST FUCTION
 */
    function sessionToken() {
        return fetch("/session/token", {
          method: "GET",
          headers: {
            "Accept": "text/plain"
          },
          credentials: "include" // needed if using session auth
        })
        .then(response => {
          if (!response.ok) {
            throw new Error("Failed to fetch CSRF token");
          }
          return response.text();
        })
        .catch(error => {
          console.error("Error fetching CSRF token:", error);
          throw error;
        });
      } 

/**-------------------------------------------------------------------------
 * 
 
 *  post function to create content using JSON:API. 
    Make sure to adjust the endpoint and data structure 
    according to your Drupal setup and content type fields. 
 ---------------------------------------------------------------------------*/      

    async function createTestContent(formData) {

        const data = {
            data: {
            type: "node--test_content",
            attributes: {
                title: formData.title,
                field_description: {
                value: formData.description,
                format: "plain_text"
                }
            }
            }
        };
  console.log('DATA: ',data)
  try {
    const response = await fetch("/jsonapi/node/test_content", {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json",
        // Uncomment if authentication is required:
        // "Authorization": "Bearer YOUR_ACCESS_TOKEN",
        "X-CSRF-Token": await sessionToken()
      },
      body: JSON.stringify(data),
      credentials: "include" // needed if using session auth
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    const result = await response.json();
    console.log("Content created:", result);
    return result;

  } catch (error) {
    console.error("Error creating content:", error);
    throw error;
  }
}



  return (
    <div>
      <h1>Test Component</h1>
      <p>This is a test component.</p>

      <div className="flex flex-col gap-4">
        <input 
        type="text" 
        name='title' 
        onChange={(e) => setFormData({...formData, title: e.target.value})}
        placeholder="title" />
        <textarea 
        className="h-80 w-full"
        type="text" 
        name='description' 
        onChange={(e) => setFormData({...formData, description: e.target.value})}
        placeholder="description" ></textarea>
        <button 
        className="bg-blue-500 text-white px-4 py-2 cursor-pointer" 
        onClick={() => createTestContent(formData)}>Submit</button>
      </div>
    </div>
  );
};

export default Test;