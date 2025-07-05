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
}
