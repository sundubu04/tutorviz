// Simulate frontend API call
const testFrontendAPI = async () => {
  try {
    console.log('Testing frontend API call...');
    
    // Simulate the exact call the frontend makes
    const params = {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
    };
    
    const queryParams = new URLSearchParams();
    if (params.start) queryParams.append('start', params.start);
    if (params.end) queryParams.append('end', params.end);
    
    const url = `http://localhost:5001/api/calendar?${queryParams.toString()}`;
    console.log('Request URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Success! Found', data.events.length, 'events');
    
    if (data.events.length > 0) {
      console.log('Sample event:', JSON.stringify(data.events[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing frontend API:', error);
  }
};

testFrontendAPI(); 