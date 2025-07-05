<?php

namespace App\Http\Controllers;

use App\Models\Opus;
use Illuminate\Http\Request;

class OpusController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Opusモデルを使って全件取得し、JSON形式で返す
        return Opus::all();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // 簡単なバリデーション（titleは必須）
        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        // リクエストデータを使って新しいOpusを作成
        // $fillableで許可したカラムのみが一度に保存される
        $opus = Opus::create($request->all());

        // 作成したデータをJSON形式で返し、ステータスコード201 (Created) を設定
        return response()->json($opus, 201);
    }
}
