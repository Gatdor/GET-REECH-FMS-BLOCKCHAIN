<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use kornrunner\IpfsApi;

class IPFSController extends Controller
{
    public function upload(Request $request)
    {
        try {
            $file = $request->file('file');
            if (!$file) {
                return response()->json(['error' => 'No file uploaded'], 400);
            }
            $ipfs = new IpfsApi('localhost', '5001');
            $content = file_get_contents($file->getRealPath());
            $hash = $ipfs->add($content);
            return response()->json(['hash' => $hash], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
