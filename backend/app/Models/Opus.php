<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Opus extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    // この$fillableプロパティを追加
    protected $fillable = [
        'title',
        'creator',
        'category',
        'sub_category',
        'status',
        'rating',
        'review',
    ];
}